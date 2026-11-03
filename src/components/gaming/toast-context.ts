import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';
export type ToastInput = {
  title: string;
  message?: string;
  tone?: ToastTone;
};

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) {
    throw new Error('useToast debe utilizarse dentro de ToastProvider.');
  }
  return notify;
}
