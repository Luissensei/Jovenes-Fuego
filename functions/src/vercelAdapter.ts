import {
  onCall as firebaseOnCall,
  HttpsError,
  type CallableRequest,
} from "firebase-functions/v2/https";

type CallableHandler = (request: CallableRequest<Record<string, unknown>>) => unknown | Promise<unknown>;
type CallableOptions = Record<string, unknown>;

export type RegisteredCallable = ReturnType<typeof firebaseOnCall> & {
  __vercelHandler: CallableHandler;
  __vercelOptions: CallableOptions;
};

/**
 * Conserva el callable nativo para un posible despliegue Firebase y adjunta
 * el handler original para que Vercel pueda ejecutarlo con Admin SDK.
 */
export function onCall(handler: CallableHandler): RegisteredCallable;
export function onCall(options: CallableOptions, handler: CallableHandler): RegisteredCallable;
export function onCall(
  optionsOrHandler: CallableOptions | CallableHandler,
  maybeHandler?: CallableHandler,
): RegisteredCallable {
  const handler = typeof optionsOrHandler === "function"
    ? optionsOrHandler
    : maybeHandler;
  if (!handler) {
    throw new Error("No se proporcionó un handler para onCall.");
  }

  const options = typeof optionsOrHandler === "function"
    ? {}
    : optionsOrHandler;
  const callable = typeof optionsOrHandler === "function"
    ? firebaseOnCall(handler as never)
    : firebaseOnCall(optionsOrHandler as never, handler as never);

  Object.defineProperties(callable, {
    __vercelHandler: {value: handler, enumerable: false},
    __vercelOptions: {value: options, enumerable: false},
  });

  return callable as unknown as RegisteredCallable;
}

export {HttpsError};
