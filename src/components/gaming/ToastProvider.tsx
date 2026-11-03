import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, CircleAlert, Info, X } from 'lucide-react';
import { ToastContext, type ToastInput } from './toast-context';

type ToastItem = ToastInput & { id: number };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((toast: ToastInput) => {
    const id = ++nextId.current;
    setItems((current) => [...current.slice(-3), { ...toast, id }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 4400));
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="jf-toast-stack" aria-live="polite" aria-relevant="additions">
        {items.map((item) => {
          const Icon = item.tone === 'error' ? CircleAlert : item.tone === 'success' ? Check : Info;
          return (
            <div className={`jf-toast jf-toast--${item.tone ?? 'info'}`} key={item.id} role={item.tone === 'error' ? 'alert' : 'status'}>
              <Icon size={19} />
              <div><strong>{item.title}</strong>{item.message && <p>{item.message}</p>}</div>
              <button type="button" className="jf-toast__close" onClick={() => dismiss(item.id)} aria-label="Cerrar notificación"><X size={15} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
