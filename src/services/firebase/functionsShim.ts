import {getToken} from "firebase/app-check";
import type {Functions} from "firebase/functions";
import {appCheck, auth} from "./client";

type CallableError = Error & {code: string; details?: unknown};

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

    try {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;
      }
      if (appCheck) {
        try {
          const token = await getToken(appCheck);
          if (token.token) headers["X-Firebase-AppCheck"] = token.token;
        } catch (cause) {
          console.warn("No se pudo obtener el token App Check:", cause);
        }
      }
    } catch {
      throw makeError("unauthenticated", "No se pudo validar la sesión actual.");
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

    const payload = await response.json().catch(() => null) as {
      data?: TResponse;
      result?: TResponse;
      error?: {status?: string; message?: string; details?: unknown};
    } | null;

    if (!payload) {
      throw makeError("internal", "El servidor devolvió una respuesta no válida.");
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
