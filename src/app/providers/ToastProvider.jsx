import { createContext, useCallback, useMemo, useState } from 'react';


const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  const showToast = useCallback((msg) => {
    setMessage(String(msg ?? ''));
    setVisible(true);
    window.setTimeout(() => setVisible(false), 2500);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={`cyber-toast ${visible ? 'toast-visible' : ''}`}>
        ⚡ {message}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastContext;

