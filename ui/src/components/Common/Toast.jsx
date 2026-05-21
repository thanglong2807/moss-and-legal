import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let _id = 0;

const CONFIG = {
  success: {
    icon: <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />,
    cls: 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: <XCircle size={15} className="shrink-0 text-red-500" />,
    cls: 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-800',
    bar: 'bg-red-500',
  },
  warn: {
    icon: <AlertTriangle size={15} className="shrink-0 text-amber-500" />,
    cls: 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800',
    bar: 'bg-amber-500',
  },
  info: {
    icon: <Info size={15} className="shrink-0 text-blue-500" />,
    cls: 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800',
    bar: 'bg-blue-500',
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++_id;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(toast => {
          const c = CONFIG[toast.type] || CONFIG.success;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3
                          rounded-2xl shadow-xl shadow-black/10 border
                          text-xs font-medium text-strong
                          min-w-[240px] max-w-[380px]
                          animate-in slide-in-from-bottom-3 fade-in duration-300
                          ${c.cls}`}
            >
              {c.icon}
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 p-0.5 text-weak hover:text-strong transition ml-1 rounded"
              >
                <X size={13} />
              </button>
              {/* Progress bar */}
              <div className={`absolute bottom-0 left-0 h-0.5 rounded-b-2xl ${c.bar} animate-[shrink_4s_linear_forwards]`}
                style={{ width: '100%', transformOrigin: 'left' }} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
