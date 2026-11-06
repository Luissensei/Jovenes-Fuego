import {getAppCheck} from "firebase-admin/app-check";
import {getAuth} from "firebase-admin/auth";
import * as callableExports from "../../functions/lib/index.js";

type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query: Record<string, string | string[] | undefined>;
  ip?: string;
  url?: string;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(value: unknown): void;
  end(): void;
};

type CallableLike = {
  __vercelHandler?: (request: {
    data: unknown;
    auth: {uid: string; token: Record<string, unknown>} | null;
    rawRequest: RequestLike;
  }) => Promise<unknown> | unknown;
  __vercelOptions?: {enforceAppCheck?: boolean};
};

const statusCodes: Record<string, number> = {
  "invalid-argument": 400,
  "failed-precondition": 400,
  "out-of-range": 400,
  "unauthenticated": 401,
  "permission-denied": 403,
  "not-found": 404,
  "already-exists": 409,
  "aborted": 409,
  "resource-exhausted": 429,
  "cancelled": 499,
  "deadline-exceeded": 504,
  "unavailable": 503,
  "data-loss": 500,
  "internal": 500,
  "unknown": 500,
};

function header(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function allowedOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "jovenes-fuego.vercel.app" ||
      /^jovenes-fuego-[a-z0-9-]+\.vercel\.app$/.test(host)
    ) {
      return true;
    }
    const configured = (process.env.APP_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return configured.includes(origin);
  } catch {
    return false;
  }
}

function respondError(
  response: ResponseLike,
  code: string,
  message: string,
  details?: unknown,
): void {
  const normalized = code.toLowerCase().replace(/_/g, "-");
  response.status(statusCodes[normalized] ?? 500).json({
    error: {
      status: normalized,
      message: message || "No se pudo completar la operación.",
      ...(details === undefined ? {} : {details}),
    },
  });
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Origin");

  const origin = header(req.headers.origin);
  if (origin && !allowedOrigin(origin)) {
    return respondError(res, "permission-denied", "Origen no autorizado.");
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Firebase-AppCheck");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return respondError(res, "invalid-argument", "Método no permitido.");
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return respondError(
      res,
      "failed-precondition",
      "El backend de Firebase en Vercel aún no tiene configurada su credencial privada.",
    );
  }

  const rawName = req.query.name;
  const name = Array.isArray(rawName) ? rawName[0] : rawName;
  if (!name || !/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(name)) {
    return respondError(res, "not-found", "La operación solicitada no existe.");
  }

  const callable = (callableExports as Record<string, unknown>)[name] as CallableLike | undefined;
  if (typeof callable !== "function" || !callable.__vercelHandler) {
    return respondError(res, "not-found", "La operación solicitada no existe.");
  }

  if (!req.body || typeof req.body !== "object" || !("data" in req.body)) {
    return respondError(res, "invalid-argument", "El formato de la solicitud no es válido.");
  }

  try {
    if (callable.__vercelOptions?.enforceAppCheck) {
      const appCheckToken = header(req.headers["x-firebase-appcheck"]);
      if (!appCheckToken) {
        return respondError(res, "unauthenticated", "Falta el token de verificación de la aplicación.");
      }
      try {
        await getAppCheck().verifyToken(appCheckToken);
      } catch {
        return respondError(res, "unauthenticated", "El token de verificación de la aplicación no es válido.");
      }
    }

    let auth: {uid: string; token: Record<string, unknown>} | null = null;
    const authorization = header(req.headers.authorization);
    const bearer = authorization.match(/^Bearer\s+(.+)$/i);
    if (bearer) {
      try {
        const decoded = await getAuth().verifyIdToken(bearer[1], true);
        auth = {uid: decoded.uid, token: decoded as unknown as Record<string, unknown>};
      } catch {
        return respondError(res, "unauthenticated", "La sesión de Firebase no es válida o ha caducado.");
      }
    }

    const data = (req.body as {data: unknown}).data;
    const result = await callable.__vercelHandler({
      data,
      auth,
      rawRequest: req,
    });
    res.status(200).json({data: result});
  } catch (cause) {
    const error = cause as {code?: string; message?: string; details?: unknown};
    const code = typeof error?.code === "string" ? error.code : "internal";
    const message = code === "internal"
      ? "El servidor no pudo completar la operación. Consulta los registros de Vercel."
      : String(error?.message ?? "No se pudo completar la operación.");
    console.error("Vercel callable failed:", {name, code});
    respondError(res, code, message, error?.details);
  }
}
