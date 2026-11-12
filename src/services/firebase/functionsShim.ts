import {getToken} from "firebase/app-check";
import type {Functions} from "firebase/functions";
import {appCheck, auth} from "./client";

type CallableError = Error & {code: string; details?: unknown};

type CallablePayload<TResponse> = {
  data?: TResponse;
  result?: TResponse;
  error?: {status?: string; message?: string; details?: unknown};
};

function makeError(code: string, message: string, details?: unknown): CallableError {
  const error = new Error(message) as CallableError;
  error.code = `functions/${code}`;
  error.details = details;
  return error;
}

/**
 * Mantiene la firma de httpsCallable para no tener que reescribir todos los
 * servicios. El backend se puede cambiar mediante VITE_FUNCTIONS_BACKEND.
 */
export function httpsCallable<TRequest = unknown, TResponse = unknown>(
  _functions: Functions,
  name: string,
): (data: TRequest) => Promise<{data: TResponse}> {
  return async (data: TRequest) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const currentUser = auth?.currentUser;
    if (currentUser) {
      try {
        headers.Authorization = `Bearer ${await currentUser.getIdToken(true)}`;
      } catch (cause) {
        const reason = cause instanceof Error ? cause.message.slice(0, 180) : "unknown";
        throw makeError(
          "unauthenticated",
          `No se pudo renovar el token de sesión de Firebase: ${reason}`,
          {reason: "client-id-token-refresh-failed"},
        );
      }
    }

    if (!appCheck) {
      throw makeError(
        "failed-precondition",
        "Firebase App Check no se inicializó. Verifica la clave de reCAPTCHA Enterprise y el dominio autorizado de la aplicación.",
      );
    }
    try {
      // Reuse the cached App Check token when valid. App Check manages
      // automatic refresh; forcing a fresh attestation on every callable
      // request can trigger unnecessary reCAPTCHA assessments.
      const token = await getToken(appCheck);
      if (!token.token) {
        throw new Error("Firebase App Check devolvió un token vacío.");
      }
      headers["X-Firebase-AppCheck"] = token.token;
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Error desconocido";
      throw makeError(
        "failed-precondition",
        `No se pudo obtener el token de verificación de la aplicación: ${detail}`,
        {reason: "app-check-token-failed"},
      );
    }

    // El backend principal de producción es Vercel. Solo se usa Firebase
    // Functions si se solicita explícitamente para desarrollo.
    const useVercel = import.meta.env.VITE_FUNCTIONS_BACKEND !== "firebase";
    const endpoint = useVercel
      ? `/api/functions/${encodeURIComponent(name)}`
      : `https://us-central1-jovenes-de-fuego.cloudfunctions.net/${encodeURIComponent(name)}`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({data}),
        cache: "no-store",
        credentials: "omit",
      });
    } catch {
      throw makeError("unavailable", "No se pudo conectar con el servidor.");
    }

    const responseText = await response.text().catch(() => "");
    let payload: CallablePayload<TResponse> | null = null;

    if (responseText) {
      try {
        payload = JSON.parse(responseText) as CallablePayload<TResponse>;
      } catch {
        payload = null;
      }
    }

    if (!payload) {
      const contentType = response.headers.get("content-type") || "tipo de contenido desconocido";
      console.error("Firebase callable returned non-JSON response:", {
        endpoint,
        status: response.status,
        contentType,
      });
      throw makeError(
        "internal",
        `El servidor devolvió una respuesta no válida (HTTP ${response.status}; ${contentType}).`,
      );
    }
    if (!response.ok || payload.error) {
      const code = String(payload.error?.status ?? "internal")
        .toLowerCase()
        .replace(/_/g, "-");
      throw makeError(
        code,
        payload.error?.message ?? "El servidor no pudo completar la operación.",
        payload.error?.details,
      );
    }

    return {data: (payload.data ?? payload.result) as TResponse};
  };
}
