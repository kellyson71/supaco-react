import React from 'react';

interface InvertedCornerProps {
  className?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fill?: string;
  size?: number;
}

export const InvertedCorner: React.FC<InvertedCornerProps> = ({ 
  className = '', 
  position, 
  fill = 'white',
  size = 40 
}) => {
  const rotation = {
    'top-left': 'rotate(180deg)',
    'top-right': 'rotate(270deg)',
    'bottom-left': 'rotate(90deg)',
    'bottom-right': 'rotate(0deg)',
  };

  return (
    <div 
      className={`absolute pointer-events-none overflow-hidden ${className}`}
      style={{ 
        width: size, 
        height: size, 
        transform: rotation[position],
      }}
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 40 40" 
        preserveAspectRatio="none"
        style={{ display: 'block' }} 
      >
        <path 
          d="M40,40 L40,0 A40,40 0 0,1 0,40 L40,40 Z" 
          fill={fill} 
        />
      </svg>
    </div>
  );
};