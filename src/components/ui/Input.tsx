import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full px-3 py-2 rounded-md border border-gray-600 bg-gray-700 text-gray-100 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
        placeholder-gray-400 ${className}`}
      {...props}
    />
  );
}; 