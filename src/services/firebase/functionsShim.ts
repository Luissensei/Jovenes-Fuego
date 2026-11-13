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
        headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;
      } catch (cause) {
        const reason = cause instanceof Error ? cause.message.slice(0, 180) : "unknown";
        throw makeError(
          "unauthenticated",
          `No se pudo renovar el token de sesión de Firebase: ${reason}`,
          {reason: "client-id-token-refresh-failed"},
        );
      }
    }

    // Solo estas operaciones administrativas exigen App Check en el backend.
    // Si el SDK entrega un token vacío o falla al obtenerlo, intentamos una
    // renovación forzada una vez y nunca enviamos la operación protegida sin token.
    const appCheckRequired = [
      "adminListLeaders",
      "adminCreateLeader",
      "adminUpdateLeader",
    ].includes(name);
    let appCheckFailure = "";

    if (appCheck) {
      try {
        let tokenResult = await getToken(appCheck);
        if (!tokenResult.token && appCheckRequired) {
          tokenResult = await getToken(appCheck, true);
        }
        if (tokenResult.token) {
          headers["X-Firebase-AppCheck"] = tokenResult.token;
        } else if (appCheckRequired) {
          appCheckFailure = "El SDK de Firebase devolvió un token vacío.";
        }
      } catch (cause) {
        const firstReason = cause instanceof Error ? cause.message : "Error desconocido";
        if (appCheckRequired) {
          try {
            const refreshed = await getToken(appCheck, true);
            if (refreshed.token) {
              headers["X-Firebase-AppCheck"] = refreshed.token;
            } else {
              appCheckFailure = "La renovación forzada también devolvió un token vacío.";
            }
          } catch (refreshCause) {
            const refreshReason = refreshCause instanceof Error
              ? refreshCause.message
              : "Error desconocido";
            appCheckFailure = `Obtención inicial: ${firstReason}. Renovación: ${refreshReason}`;
          }
        } else {
          console.warn("App Check no entregó token para esta llamada:", firstReason);
        }
      }
    } else if (appCheckRequired) {
      appCheckFailure = "Firebase App Check no se inicializó en este navegador.";
    }

    if (appCheckRequired && !headers["X-Firebase-AppCheck"]) {
      throw makeError(
        "failed-precondition",
        `Firebase App Check no pudo generar el token requerido. ${appCheckFailure || "Comprueba la clave Enterprise y el dominio autorizado."}`,
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
