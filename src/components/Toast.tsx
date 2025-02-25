import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="text-green-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    info: <AlertCircle className="text-blue-500" size={20} />,
  };

  const bgColors = {
    success: 'bg-green-100 dark:bg-green-800',
    error: 'bg-red-100 dark:bg-red-800',
    info: 'bg-blue-100 dark:bg-blue-800',
  };

  return (
    <div className={`fixed bottom-4 right-4 flex items-center p-4 rounded-lg shadow-lg ${bgColors[type]}`}>
      <div className="flex items-center">
        {icons[type]}
        <span className="ml-2 text-gray-800 dark:text-gray-100">{message}</span>
      </div>
    </div>
  );
};

export default Toast; 