// app/dashboard/pages/maindashboard/page.jsx
"use client";

import { Suspense, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SensorPanel from './SensorPanel';
import SchedulePanel from './SchedulePanel';
import CollectionsPanel from './CollectionsPanel';
import SpaceManagementPanel from './SpaceManagementPanel';
import WeatherPanel from './WeatherPanel';
import SystemStatus from './SystemStatus';

// Importación dinámica para mejorar el rendimiento de carga inicial
const IfcViewer = dynamic(() => import('./BIMViewer/modelViewer'), {
  ssr: false, // Desactivar SSR para componentes que dependen del DOM
});

// Componente de fallback para errores

interface ErrorFallbackProps {
  resetErrorBoundary: () => void;
}
const ErrorFallback = ({ resetErrorBoundary }: ErrorFallbackProps) => (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-950/90 p-4">
    <div className="text-center">
      <div className="text-red-400 mb-2">⚠️ Error en el visualizador</div>
      <button 
        className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-300 px-3 py-1 rounded border border-red-800/50 transition-colors"
        onClick={resetErrorBoundary}
      >
        Recargar componente
      </button>
    </div>
  </div>
);

// Componente de carga
const LoadingFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950">
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-blue-500/30 border-t-blue-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-blue-400 animate-ping" />
        </div>
      </div>
      <span className="text-sm text-blue-300 font-mono">Cargando modelo...</span>
    </div>
  </div>
);

const Header = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  const handleModelLoad = useCallback(() => {
    setIsModelLoaded(true);
  }, []);
  
  const handleError = useCallback(() => {
    console.error("Error al cargar el modelo IFC");
  }, []);
  
  return (
    <div className="bg-gray-900 min-h-screen overflow-hidden mx-auto">
      <main className="relative h-screen overflow-hidden">
        {/* Visor 3D que ocupa toda la pantalla */}
        <div className="absolute inset-0">
          <Suspense fallback={<LoadingFallback />}>
            <IfcViewer onModelLoaded={handleModelLoad} onItemSelected={handleError} />
          </Suspense>
        </div>
        
        {/* Overlay de interfaz integrada */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Cabecera semi-transparente */}
          <div className="h-12 w-full bg-gray-900/30 backdrop-blur-sm border-b border-blue-500/20 flex items-center px-4 justify-between pointer-events-auto">
            <div className="flex items-center">
              <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-semibold">
                VISUALIZACIÓN DE EDIFICIO
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-300">
              <div className="flex items-center">
                <div className={`h-1.5 w-1.5 rounded-full ${isModelLoaded ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'} mr-2`} />
                <span className="font-mono">Modelo: {isModelLoaded ? 'Activo' : 'Cargando...'}</span>
              </div>
              <div className="text-xs text-gray-400 font-mono">v3.1.4 | IFC 4.3</div>
            </div>
          </div>
          
          {/* Panel lateral izquierdo integrado */}
          <div className="absolute top-16 left-4 bottom-4 w-60 flex flex-col gap-4 pointer-events-auto">
            <WeatherPanel />
            <SensorPanel />
            <SpaceManagementPanel />
          </div>
          
          {/* Paneles flotantes en la parte derecha */}
          <div className="absolute top-16 right-4 w-64 pointer-events-auto">
            <SystemStatus />
          </div>
          
          {/* Paneles flotantes en la parte inferior derecha */}
          <div className="absolute bottom-4 right-4 w-64 pointer-events-auto">
            <SchedulePanel />
          </div>
          
          {/* Controles flotantes en la parte inferior */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 pointer-events-auto">
            <button className="p-2 bg-gray-800/40 hover:bg-gray-700/60 backdrop-blur-sm rounded-full border border-blue-500/30 shadow-lg transition-all hover:scale-105">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="p-2 bg-gray-800/40 hover:bg-gray-700/60 backdrop-blur-sm rounded-full border border-blue-500/30 shadow-lg transition-all hover:scale-105">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button className="p-2 bg-gray-800/40 hover:bg-gray-700/60 backdrop-blur-sm rounded-full border border-blue-500/30 shadow-lg transition-all hover:scale-105">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Header;