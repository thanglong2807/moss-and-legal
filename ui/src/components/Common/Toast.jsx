import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let _id = 0;

const ICONS = {
  success: <CheckCircle size={17} className="shrink-0 text-emerald-400" />,
  error:   <XCircle    size={17} className="shrink-0 text-red-300" />,
  warn:    <AlertTriangle size={17} className="shrink-0 text-yellow-400" />,
};

const BG = {
  success: 'bg-gray-900',
  error:   'bg-red-700',
  warn:    'bg-yellow-700',
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
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold min-w-[260px] max-w-[400px] animate-in slide-in-from-bottom-3 fade-in duration-300 text-white ${BG[toast.type] || BG.success}`}>
            {ICONS[toast.type] || ICONS.success}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} className="shrink-0 opacity-50 hover:opacity-100 transition ml-1">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
