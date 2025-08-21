import React from 'react';

interface LoadingOverlayProps {
  status: string;
}

/**
 * Componente para mostrar un overlay de carga
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ status }) => {
  return (
    <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-3 p-5 rounded-lg bg-gray-800/80 text-gray-200 shadow-xl max-w-xs">
        <div className="h-8 w-8 rounded-full border-3 border-blue-500/30 border-t-blue-400 animate-spin"></div>
        <div className="text-sm font-medium text-center">{status || "Loading model..."}</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;