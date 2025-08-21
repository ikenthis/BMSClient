import React from 'react';

interface ErrorOverlayProps {
  error: string;
}

/**
 * Componente para mostrar un overlay de error
 */
const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ error }) => {
  return (
    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-3 p-5 rounded-lg bg-gray-800/90 text-gray-200 shadow-xl max-w-xs">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div className="text-base font-medium">Error loading model</div>
        <div className="text-sm text-gray-400 text-center">{error}</div>
      </div>
    </div>
  );
};

export default ErrorOverlay;