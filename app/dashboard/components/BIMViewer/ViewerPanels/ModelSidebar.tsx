"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { ModelInfo } from '../types';
import { useBIMData } from '../hooks/useBimData';
import { API_URL_BIM } from '@/server';

interface ModelSidebarProps {
  onModelUrlsChange: (urls: string[]) => Promise<{ success: boolean; message?: string }>;
  isOpen: boolean;
  onClose?: () => void;
  loadedModelUrls?: Set<string>; // Cambiamos a URLs completas
}

/**
 * Componente Sidebar para seleccionar y cambiar entre modelos BIM
 */
const ModelSidebar: React.FC<ModelSidebarProps> = ({ 
  onModelUrlsChange,
  isOpen,
  onClose,
  loadedModelUrls = new Set()
}) => {
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Obtener modelos desde la API
  const { 
    models, 
    isLoading: modelsLoading, 
    error: modelsError,
    loadModels
  } = useBIMData({ autoLoad: true });

  // Obtener la URL del modelo para comparar con loadedModelUrls
  const getModelUrl = (model: ModelInfo): string => {
    if (!model._id) return '';
    return `${API_URL_BIM}/models/${model._id}/firebase-file`;
  };

  // Verificar si un modelo ya está cargado
  const isModelLoaded = (model: ModelInfo): boolean => {
    const modelUrl = getModelUrl(model);
    if (!modelUrl) return false;
    
    return Array.from(loadedModelUrls).some(url => {
      // Normalizamos ambas URLs para una comparación más robusta
      const normalizedStoredUrl = url.trim();
      const normalizedModelUrl = modelUrl.trim();
      return normalizedStoredUrl === normalizedModelUrl;
    });
  };

  // Limpiar notificación después de unos segundos
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Manejar selección de modelos
  const handleModelSelect = useCallback((model: ModelInfo, isSelected: boolean) => {
    setSelectedModels(prev => {
      if (isSelected) {
        if (!prev.some(m => m._id === model._id)) {
          return [...prev, model];
        }
      } else {
        return prev.filter(m => m._id !== model._id);
      }
      return prev;
    });
  }, []);

  // Cargar modelos seleccionados
  const handleLoadSelectedModels = useCallback(async () => {
    if (selectedModels.length > 0) {
      // Comprobar si hay modelos ya cargados
      const alreadyLoadedModels = selectedModels.filter(model => isModelLoaded(model));
      
      if (alreadyLoadedModels.length > 0 && alreadyLoadedModels.length === selectedModels.length) {
        setNotification({
          message: "Todos los modelos seleccionados ya están cargados en el visor",
          type: "info"
        });
        return;
      }
      
      // Generar URLs para todos los modelos seleccionados
      // Ahora dejamos que la función handleModelUrlsChange filtre los duplicados
      const urls = selectedModels
        .filter(model => model._id && /^[0-9a-f]{24}$/i.test(model._id))
        .map(model => getModelUrl(model));
      
      // Verificar si tenemos URLs para cargar
      if (urls.length === 0) {
        setNotification({
          message: "No hay modelos válidos para cargar",
          type: "error"
        });
        return;
      }
      
      // Para depuración
      console.log("[DEBUG ModelSidebar] URLs a cargar:", urls);
      console.log("[DEBUG ModelSidebar] URLs ya cargadas:", Array.from(loadedModelUrls));
      
      // Cargar modelos y procesar respuesta
      const result = await onModelUrlsChange(urls);
      
      if (result.success) {
        setNotification({
          message: result.message || "Modelos seleccionados para cargar",
          type: "success"
        });
        
        // Cerrar el sidebar después de cargar los modelos, si se proporcionó la función onClose
        if (onClose) {
          onClose();
        }
      } else {
        setNotification({
          message: result.message || "Error al seleccionar los modelos",
          type: "error"
        });
      }
    }
  }, [selectedModels, onModelUrlsChange, onClose, loadedModelUrls, isModelLoaded]);

  // Si no está abierto, no renderizar nada
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 z-30 w-64 transform transition-transform duration-300 ease-in-out">
      <div className="h-full bg-gray-800/90 backdrop-blur-sm border-l border-gray-700/50 shadow-lg overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-gray-200 text-sm font-medium">Modelos ({models.length})</h3>
          {onClose && (
            <button 
              className="text-gray-400 hover:text-gray-200"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        
        {/* Notification */}
        {notification && (
          <div className={`mx-4 mt-4 p-2 rounded-md text-sm ${
            notification.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-700/50' :
            notification.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-700/50' :
            'bg-blue-900/50 text-blue-200 border border-blue-700/50'
          }`}>
            {notification.message}
          </div>
        )}
        
        {/* Loading state */}
        {modelsLoading && (
          <div className="p-4 text-sm text-gray-400 text-center">
            Cargando modelos...
          </div>
        )}
        
        {/* Error state */}
        {modelsError && (
          <div className="p-4 text-sm text-red-400 text-center">
            Error al cargar modelos: {modelsError}
          </div>
        )}
        
        {/* Empty state */}
        {!modelsLoading && models.length === 0 && (
          <div className="p-4 text-sm text-gray-400 text-center">
            No hay modelos disponibles
          </div>
        )}
        
        {/* Model list */}
        {models.length > 0 && (
          <div className="p-4">
            <div className="space-y-2">
              {models.map((model: ModelInfo) => {
                const isSelected = selectedModels.some(m => m._id === model._id);
                const isAlreadyLoaded = isModelLoaded(model);
                
                return (
                  <div 
                    key={model._id} 
                    className={`flex items-center p-2 rounded-md cursor-pointer ${
                      isAlreadyLoaded ? 'bg-green-900/20 border border-green-700/40 hover:bg-green-900/30' :
                      isSelected ? 'bg-blue-900/20 border border-blue-700/40 hover:bg-blue-900/30' : 
                      'border border-transparent hover:bg-gray-700/50'
                    }`}
                    onClick={() => handleModelSelect(model, !isSelected)}
                  >
                    <input
                      type="checkbox"
                      className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      checked={isSelected}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-200 truncate">
                        {model.name}
                        {isAlreadyLoaded && (
                          <span className="ml-2 text-xs font-normal text-green-400">(cargado)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {model.fileName}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Actions */}
            <div className="mt-6 flex items-center justify-between">
              <button 
                className="text-xs text-gray-400 hover:text-gray-200"
                onClick={() => setSelectedModels([])}
              >
                Limpiar
              </button>
              <button 
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
                onClick={handleLoadSelectedModels}
                disabled={selectedModels.length === 0}
              >
                Cargar modelos ({selectedModels.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelSidebar;