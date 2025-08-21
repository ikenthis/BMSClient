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
const IfcViewer = dynamic(() => import('./BIMViewer/BIMViewerPage'), {
  ssr: false, // Desactivar SSR para componentes que dependen del DOM
});

// Componente de fallback para errores
const ErrorFallback = ({ resetErrorBoundary }) => (
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
      <span className="text-sm text-blue-300 font-mono">Inicializando visualizador...</span>
    </div>
  </div>
);

const Dashboard = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  const handleModelLoad = useCallback((models) => {
    console.log("Modelos cargados:", models.length);
    setIsModelLoaded(true);
  }, []);
  
  const handleItemSelected = useCallback((item) => {
    if (item) {
      console.log("Elemento seleccionado en dashboard:", item);
      // Aquí puedes implementar lógica adicional cuando se selecciona un elemento
    }
  }, []);
  
  return (
    <div className="bg-gray-900 min-h-screen overflow-hidden mx-auto">
      <main className="flex h-screen relative">
        {/* Main Content - Digital Twin Viewer - Full Width */}
        <div className="w-full h-full relative">
          {/* Esta div contiene el visor 3D y ocupa todo el espacio disponible */}
          <div className="absolute inset-0">
            <div className="h-full w-full square-lg overflow-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <IfcViewer 
                  onModelLoaded={handleModelLoad} 
                  onItemSelected={handleItemSelected}
                  // No pasamos modelUrl, dejamos que se carguen solo desde la API
                />
              </Suspense>
            </div>
          </div>
          
          {/* Paneles laterales superpuestos en sus posiciones originales */}
          <div className="absolute left-4 z-10 flex flex-col gap-4 max-w-xs mt-4">
            {/* Paneles izquierdos */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-lg">
              <WeatherPanel />
            </div>
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-lg">
              <SensorPanel />
            </div>
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-lg">
              <SpaceManagementPanel />
            </div>
          </div>
          
          {/* Paneles derechos superpuestos */}
          <div className="absolute right-4 z-10 flex flex-col gap-4 max-w-xs mt-4">
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-lg">
              <SystemStatus />
            </div>
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-lg">
              <SchedulePanel />
            </div>
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-lg">
              <CollectionsPanel />
            </div>
          </div>

          {/* Floating controls */}
          <div className="absolute bottom-4 right-4 flex gap-2 z-20">
            <button className="p-2 bg-gray-800/80 hover:bg-gray-700/90 backdrop-blur-sm rounded-full border border-gray-700/50 shadow-lg transition-all hover:scale-105">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button className="p-2 bg-gray-800/80 hover:bg-gray-700/90 backdrop-blur-sm rounded-full border border-gray-700/50 shadow-lg transition-all hover:scale-105">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          
          {/* Status bar - floating at bottom */}
          <div className="absolute bottom-0 left-[250px] flex items-center justify-between text-xs text-gray-400 bg-gray-900/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-700/50 h-6 w-60 shadow-lg z-20">
            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${isModelLoaded ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
              <span className="font-mono">Modelo: {isModelLoaded ? 'Cargado' : 'Esperando selección...'}</span>
            </div>
            <div className="flex gap-2 ml-4">
              <span className="font-mono">v3.1.4</span>
              <span className="text-gray-500">|</span>
              <span className="font-mono">IFC 4.3</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;