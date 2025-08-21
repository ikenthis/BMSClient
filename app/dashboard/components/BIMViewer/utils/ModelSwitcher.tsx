"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ModelInfo } from '../types';
import { useBIMData } from '../hooks/useBimData';
import { API_URL_BIM } from '@/server';

interface ModelSwitcherProps {
  onModelUrlsChange: (urls: string[]) => void;
  className?: string;
}

/**
 * Componente para seleccionar y cambiar entre modelos BIM
 */
const ModelSwitcher: React.FC<ModelSwitcherProps> = ({ 
  onModelUrlsChange,
  className = ''
}) => {
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([]);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  
  // Obtener modelos desde la API
  const { 
    models, 
    isLoading: modelsLoading, 
    error: modelsError,
    loadModels
  } = useBIMData({ autoLoad: true });

  // Inicializar posición del botón
  useEffect(() => {
    if (buttonPosition.x === 0 && buttonPosition.y === 0) {
      // Posición inicial: centrado y cerca de la parte superior
      setButtonPosition({
        x: window.innerWidth / 2 - 20,
        y: 20
      });
    }
  }, []);

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
  const handleLoadSelectedModels = useCallback(() => {
    if (selectedModels.length > 0) {
      const urls = selectedModels
        .filter(model => model._id && /^[0-9a-f]{24}$/i.test(model._id))
        .map(model => `${API_URL_BIM}/models/${model._id}/firebase-file`);
      
      onModelUrlsChange(urls);
      setIsModelSelectorOpen(false);
    }
  }, [selectedModels, onModelUrlsChange]);

  // Drag & Drop para el botón
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartPosRef.current = { 
      x: e.clientX - buttonPosition.x, 
      y: e.clientY - buttonPosition.y 
    };
    e.preventDefault();
  }, [buttonPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    setButtonPosition({
      x: e.clientX - dragStartPosRef.current.x,
      y: e.clientY - dragStartPosRef.current.y
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Configurar event listeners para el drag
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Si no hay modelos, no renderizar nada
  if (models.length === 0 && !modelsLoading) {
    return null;
  }

  return (
    <div className={`absolute z-20 ${className}`}>
      {/* Botón flotante para abrir el selector */}
      <div 
        style={{ 
          position: 'fixed',
          left: `${buttonPosition.x}px`, 
          top: `${buttonPosition.y}px`
        }}
      >
        <button
          className="bg-gray-800/90 backdrop-blur-sm p-1.5 rounded-lg border border-gray-700/50 shadow-lg text-gray-200 hover:bg-gray-700/90 transition-colors cursor-move text-xs"
          onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
          onMouseDown={handleMouseDown}
        >
          {isModelSelectorOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Panel selector de modelos */}
      {isModelSelectorOpen && (
        <div 
          style={{
            position: 'fixed',
            top: `${buttonPosition.y + 30}px`,
            left: '50%',
            transform: 'translateX(-50%)'
          }}
          className="bg-gray-800/90 backdrop-blur-sm p-3 rounded-lg border border-gray-700/50 shadow-lg max-w-xs max-h-[60vh] overflow-y-auto"
        >
          <h3 className="text-gray-200 text-xs font-medium mb-2 flex items-center justify-between">
            <span>Modelos disponibles ({models.length})</span>
            <button 
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded-md transition-colors disabled:opacity-50"
              onClick={handleLoadSelectedModels}
              disabled={selectedModels.length === 0}
            >
              Cargar {selectedModels.length}
            </button>
          </h3>
          
          <div className="space-y-1 mt-2">
            {models.map((model: ModelInfo) => {
              const isSelected = selectedModels.some(m => m._id === model._id);
              return (
                <div 
                  key={model._id} 
                  className={`flex items-center p-1.5 rounded-md hover:bg-gray-700/50 cursor-pointer ${
                    isSelected ? 'bg-blue-900/20 border border-blue-700/40' : 'border border-transparent'
                  }`}
                  onClick={() => handleModelSelect(model, !isSelected)}
                >
                  <input
                    type="checkbox"
                    className="mr-2 h-3 w-3 text-blue-600 rounded focus:ring-blue-500"
                    checked={isSelected}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-gray-200 truncate">{model.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {model.fileName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {selectedModels.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <button 
                  className="text-xs text-gray-400 hover:text-gray-200"
                  onClick={() => setSelectedModels([])}
                >
                  Limpiar
                </button>
                <button 
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded-md transition-colors"
                  onClick={handleLoadSelectedModels}
                >
                  Cargar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSwitcher;