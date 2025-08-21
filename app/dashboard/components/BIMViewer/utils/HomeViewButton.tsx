// HomeViewButton.tsx
"use client";

import React from 'react';
import { Home, RotateCcw } from 'lucide-react';

interface HomeViewButtonProps {
  onResetToGeneralView: () => void;
  isLoading?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'icon-only';
  tooltip?: string;
}

/**
 * Botón para regresar a la vista general del modelo 3D
 */
const HomeViewButton: React.FC<HomeViewButtonProps> = ({
  onResetToGeneralView,
  isLoading = false,
  className = '',
  variant = 'default',
  tooltip = 'Regresar a vista general'
}) => {
  
  const handleClick = () => {
    if (!isLoading) {
      onResetToGeneralView();
    }
  };

  const baseClasses = `
    inline-flex items-center justify-center
    transition-all duration-200 ease-in-out
    border border-gray-300 
    hover:border-gray-400 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
    disabled:opacity-50 disabled:cursor-not-allowed
    ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
  `;

  const variantClasses = {
    'default': `
      px-4 py-2 rounded-lg
      bg-white hover:bg-gray-50 
      text-gray-700 hover:text-gray-900
      shadow-sm hover:shadow-md
      text-sm font-medium
    `,
    'compact': `
      px-3 py-1.5 rounded-md
      bg-gray-100 hover:bg-gray-200
      text-gray-600 hover:text-gray-800
      text-xs font-medium
    `,
    'icon-only': `
      p-2 rounded-full
      bg-white hover:bg-gray-50
      text-gray-600 hover:text-gray-800
      shadow-lg hover:shadow-xl
    `
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={combinedClasses}
      title={tooltip}
      aria-label={tooltip}
    >
      {/* Icono */}
      <div className="relative">
        {isLoading ? (
          <RotateCcw 
            size={variant === 'icon-only' ? 20 : 16} 
            className="animate-spin" 
          />
        ) : (
          <Home 
            size={variant === 'icon-only' ? 20 : 16} 
            className="transition-transform duration-200 group-hover:scale-110" 
          />
        )}
      </div>
      
      {/* Texto (solo para variantes que no sean icon-only) */}
      {variant !== 'icon-only' && (
        <span className={`${variant === 'default' ? 'ml-2' : 'ml-1.5'}`}>
          {isLoading ? 'Centrando...' : 'Vista General'}
        </span>
      )}
    </button>
  );
};

export default HomeViewButton;