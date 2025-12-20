import React from 'react';

interface ProgressBarProps {
    value: number;
    max?: number;
    color?: string; // Hex color or tailwind class
    height?: number; // px
    className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, color = 'bg-primary', height = 6, className = '' }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${className}`} style={{ height: `${height}px` }}>
            <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${color?.startsWith('bg-') ? color : ''}`}
                style={{
                    width: `${percentage}%`,
                    backgroundColor: !color?.startsWith('bg-') ? color : undefined
                }}
            />
        </div>
    );
};

export default ProgressBar;
