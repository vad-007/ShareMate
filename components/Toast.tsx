import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X, Bell } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose, action }) => {
  useEffect(() => {
    if (isVisible) {
      // If there is an action, give the user more time (6s), otherwise 3s
      const duration = action ? 6000 : 3000;
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, action]);

  if (!isVisible) return null;

  const bgColors = {
    success: 'bg-white border-green-100',
    error: 'bg-white border-red-100',
    info: 'bg-slate-800 border-slate-700 text-white'
  };

  const textColors = {
    success: 'text-slate-800',
    error: 'text-slate-800',
    info: 'text-white'
  };

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 ${bgColors[type]}`}>
      {type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
      {type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
      {type === 'info' && <Bell className="w-5 h-5 text-brand-400" />}
      
      <div className={`flex flex-col ${textColors[type]}`}>
        <span className="font-medium text-sm">{message}</span>
      </div>

      {action && (
        <button 
          onClick={action.onClick}
          className="ml-2 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-md transition-colors whitespace-nowrap"
        >
          {action.label}
        </button>
      )}

      <button onClick={onClose} className={`ml-2 ${type === 'info' ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};