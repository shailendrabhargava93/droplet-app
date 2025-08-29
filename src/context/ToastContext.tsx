import React, { createContext, useContext, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface ToastContextType {
  showSuccess: (summary: string, detail: string) => void;
  showInfo: (summary: string, detail: string) => void;
  showWarn: (summary: string, detail: string) => void;
  showError: (summary: string, detail: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const showSuccess = (summary: string, detail: string) => {
    toast.success(
      <div className="toast-message">
        <strong>{summary}</strong>
        <p>{detail}</p>
      </div>
    );
  };

  const showInfo = (summary: string, detail: string) => {
    toast(
      <div className="toast-message">
        <strong>{summary}</strong>
        <p>{detail}</p>
      </div>
    );
  };

  const showWarn = (summary: string, detail: string) => {
    toast(
      <div className="toast-message">
        <strong>{summary}</strong>
        <p>{detail}</p>
      </div>,
      { icon: '⚠️' }
    );
  };

  const showError = (summary: string, detail: string) => {
    toast.error(
      <div className="toast-message">
        <strong>{summary}</strong>
        <p>{detail}</p>
      </div>
    );
  };

  return (
    <ToastContext.Provider
      value={{ showSuccess, showInfo, showWarn, showError }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
