import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'hero' | 'stat';
    className?: string;
    children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ variant = 'default', className = '', children, ...props }) => {
    const baseClasses = "rounded-2xl transition-all duration-200";

    const variants = {
        default: "bg-surface-light dark:bg-surface-dark border border-[#f0f2f4] dark:border-slate-700 shadow-sm hover:shadow-md",
        hero: "bg-gradient-to-br from-primary to-blue-600 dark:from-primary-dark dark:to-blue-500 text-white shadow-lg shadow-blue-500/20",
        stat: "bg-surface-light dark:bg-surface-dark border border-[#f0f2f4] dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/20 dark:hover:border-primary-dark/30 hover:-translate-y-1",
    };

    return (
        <div className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
            {children}
        </div>
    );
};

export default Card;
