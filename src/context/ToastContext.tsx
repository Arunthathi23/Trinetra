import { createContext, useContext, useState, ReactNode } from 'react';
import { ViolationAlert } from '../hooks/useWebSocket';

interface ToastContextType {
  toasts: ViolationAlert[];
  addToast: (alert: ViolationAlert) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ViolationAlert[]>([]);

  const addToast = (alert: ViolationAlert) => {
    setToasts(prev => [alert, ...prev.slice(0, 4)]); // Keep max 5 toasts
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}