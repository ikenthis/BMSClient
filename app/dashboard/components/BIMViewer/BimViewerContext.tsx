"use client";
//BimViewerContext.tsx
// Importaciones necesarias
import React, { createContext, useContext, useRef, useState } from 'react';
import * as FRAGS from '@thatopen/fragments';
import { useViewerState } from './hooks/useViewerState';
import { BIMViewerContextType, UseViewerStateProps } from './types';
import { useModelExtractor } from './hooks/useModelExtractor';
import axios from 'axios';
import { API_URL_BIM } from '@/server';

const BIMViewerContext = createContext<BIMViewerContextType | null>(null);

interface BIMViewerProviderProps extends UseViewerStateProps {
  children: React.ReactNode;
}

// Función para obtener el ID de un modelo de manera segura
const getModelId = (model: any): string => {
  // @ts-ignore - Accedemos a propiedades que pueden no estar definidas en el tipo
  const id = model.id || model.modelId || model.uuid;
  
  if (id) return String(id);
  
  // Generar un ID único si no existe
  return `model_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Verificar si un modelo ya está procesado
const checkModelProcessed = async (modelId: string): Promise<boolean> => {
  try {
    // Consultar a la API si este modelo ya tiene elementos extraídos
    const response = await axios.get(`${API_URL_BIM}/elements/count/${modelId}`, {
      withCredentials: true
    });
    
    // Si hay elementos, consideramos que ya está procesado
    return response.data.count > 0;
  } catch (error) {
    console.warn(`Error verificando si el modelo ${modelId} está procesado:`, error);
    return false; // En caso de error, asumimos que no está procesado
  }
};

export const BIMViewerProvider: React.FC<BIMViewerProviderProps> = ({
  children,
  modelUrls = [],
  onModelLoaded,
  onItemSelected
}) => {
  // Modificado: Asegurarnos de que containerRef siempre sea un tipo simple
  // sin el posible null en el tipo
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Estado para seguimiento de modelos procesados
  const [processedModels, setProcessedModels] = useState<Set<string>>(new Set());
  const [processingStatus, setProcessingStatus] = useState({ 
    isProcessing: false, 
    message: '', 
    progress: 0,
    modelId: ''
  });
  
  // Hook para extraer datos de modelos
  const { extractModelData, isExtracting, progress } = useModelExtractor({
    onProgress: (percent, message) => {
      setProcessingStatus(prev => ({ ...prev, progress: percent, message }));
    },
    onComplete: (count) => {
      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        message: `Procesamiento completado: ${count} elementos guardados`
      }));
      
      // Añadir a modelos procesados
      if (processingStatus.modelId) {
        setProcessedModels(prev => new Set([...prev, processingStatus.modelId]));
      }
      
      // Limpiar el mensaje después de un tiempo
      setTimeout(() => {
        setProcessingStatus(prev => ({ ...prev, message: '' }));
      }, 5000);
    },
    onError: (error) => {
      setProcessingStatus(prev => ({
        ...prev,
        isProcessing: false,
        message: `Error: ${error.message}`
      }));
    }
  });
  
  // Función personalizada para manejar la carga de modelos
  const handleInternalModelLoaded = async (loadedModels: any[]) => {
    console.log('Modelos cargados internamente:', loadedModels);
    
    // Procesar automáticamente cada modelo que no haya sido procesado
    if (loadedModels && loadedModels.length > 0 && !processingStatus.isProcessing) {
      // Buscamos el primer modelo no procesado (tanto en memoria como en BD)
      for (const model of loadedModels) {
        const modelId = getModelId(model);
        
        if (!processedModels.has(modelId)) {
          try {
            // Verificar si ya existe en MongoDB
            const isProcessed = await checkModelProcessed(modelId);
            
            if (isProcessed) {
              // Si ya está procesado, añadirlo a la lista en memoria
              setProcessedModels(prev => new Set([...prev, modelId]));
              console.log(`✅ Modelo ${modelId} ya está procesado en BD, omitiendo extracción`);
              continue;
            }
            
            console.log(`🔄 Iniciando procesamiento automático del modelo ${modelId}`);
            
            setProcessingStatus({
              isProcessing: true,
              message: 'Iniciando procesamiento del modelo...',
              progress: 0,
              modelId
            });
            
            // Iniciar la extracción de datos
            extractModelData(model, modelId)
              .then(success => {
                if (!success) {
                  console.error(`❌ Error al procesar el modelo ${modelId}`);
                }
              })
              .catch(error => {
                console.error(`❌ Error inesperado al procesar el modelo:`, error);
              });
            
            // Solo procesamos un modelo a la vez
            break;
          } catch (error) {
            console.error(`Error al verificar/procesar modelo ${modelId}:`, error);
          }
        }
      }
    }
    
    // Llamar al callback original si existe
    if (onModelLoaded) onModelLoaded(loadedModels);
  };

  // Utilizamos el hook de estado con nuestro handler personalizado
  const viewerState = useViewerState({
    modelUrls,
    onModelLoaded: handleInternalModelLoaded,
    onItemSelected,
    containerRef
  });

  // Función para cargar modelos adicionales sin reemplazar los existentes
  const addModels = async (urls: string[]) => {
    if (!viewerState.fragments) {
      throw new Error("Fragments engine not initialized");
    }
    
    return viewerState.addModels(urls);
  };

  // Función para reemplazar los modelos actuales con nuevos modelos
  const loadModels = async (urls: string[]) => {
    if (!viewerState.fragments) {
      throw new Error("Fragments engine not initialized");
    }
    
    try {
      // Primero eliminamos todos los modelos existentes
      const modelIds = viewerState.getModelIds();
      for (const modelId of modelIds) {
        await viewerState.removeModel(modelId);
      }
      
      // Luego cargamos los nuevos modelos
      return viewerState.addModels(urls);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      viewerState.setStatus(`Failed to load models: ${errorMessage}`);
      throw error;
    }
  };

  // Función para eliminar un modelo específico
  const removeModel = async (modelId: string) => {
    if (!viewerState.fragments) {
      throw new Error("Fragments engine not initialized");
    }
    
    return viewerState.removeModel(modelId);
  };

  // Función para exportar los datos binarios de un modelo
  const exportModelData = async (modelId: string) => {
    if (!viewerState.fragments) {
      throw new Error("Fragments engine not initialized");
    }
    
    return viewerState.exportModelData(modelId);
  };
  
  // El valor que pasaremos al contexto
  const contextValue: BIMViewerContextType = {
    containerRef,
    viewerState,
    loadModels,
    addModels,
    removeModel,
    exportModelData,
    // Añadir nuevas propiedades al contexto
    processingStatus,
    processedModels: Array.from(processedModels),
    isExtracting
  };

  return (
    <BIMViewerContext.Provider value={contextValue}>
      {/* Mostrar indicador de procesamiento */}
      {processingStatus.message && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-800/90 py-2 px-4 rounded-md text-sm text-gray-200 shadow-lg max-w-md mx-auto">
          {processingStatus.isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin"></div>
              <div>
                <div className="font-medium">{processingStatus.message}</div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full mt-1">
                  <div 
                    className="h-1.5 bg-blue-500 rounded-full" 
                    style={{ width: `${processingStatus.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{processingStatus.message}</span>
            </div>
          )}
        </div>
      )}
      {children}
    </BIMViewerContext.Provider>
  );
};

export const useBIMViewerContext = (): BIMViewerContextType => {
  const context = useContext(BIMViewerContext);
  if (!context) {
    throw new Error('useBIMViewer must be used within a BIMViewerProvider');
  }
  return context;
};