import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'primary', children, className = '' }) => {
  const variants = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-gray-100 text-gray-600 border-gray-200",
    success: "bg-green-50 text-green-600 border-green-200",
    warning: "bg-yellow-50 text-yellow-600 border-yellow-200",
    danger: "bg-red-50 text-red-600 border-red-200",
    info: "bg-blue-50 text-blue-600 border-blue-200",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;