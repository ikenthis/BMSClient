// components/ProcessModelData.tsx
import React, { useState } from 'react';
import { useModelExtractor } from '../hooks/useModelExtractor';

interface ProcessModelDataProps {
  model: any;
  modelId: string;
  onComplete?: (count: number) => void;
}

const ProcessModelData: React.FC<ProcessModelDataProps> = ({ 
  model, 
  modelId, 
  onComplete 
}) => {
  const [message, setMessage] = useState('');
  const [processingComplete, setProcessingComplete] = useState(false);
  
  const { extractModelData, isExtracting, progress } = useModelExtractor({
    onProgress: (percent, msg) => {
      setMessage(msg);
    },
    onComplete: (count) => {
      setMessage(`Procesamiento completado. Se han extraído ${count} elementos.`);
      setProcessingComplete(true);
      if (onComplete) onComplete(count);
    },
    onError: (error) => {
      setMessage(`Error en el procesamiento: ${error.message}`);
    }
  });
  
  const handleExtract = async () => {
    if (isExtracting) return;
    
    setProcessingComplete(false);
    const success = await extractModelData(model, modelId);
    
    if (!success) {
      setMessage('No se pudo completar el procesamiento del modelo.');
    }
  };
  
  return (
    <div className="bg-gray-800/90 backdrop-blur-sm p-4 rounded-md border border-gray-700">
      <h3 className="text-lg font-medium text-gray-200 mb-2">Procesar Datos del Modelo</h3>
      <p className="text-sm text-gray-400 mb-4">
        Este proceso extraerá todos los elementos del modelo 3D y los guardará en la base de datos 
        para habilitar raycasting mejorado y búsquedas avanzadas.
      </p>
      
      {isExtracting ? (
        <div className="mt-4">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="mt-2 text-sm text-gray-300">{message}</div>
        </div>
      ) : (
        <div className="mt-4">
          {processingComplete ? (
            <div className="flex items-center text-green-400 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{message}</span>
            </div>
          ) : (
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
              onClick={handleExtract}
              disabled={isExtracting}
            >
              Iniciar Procesamiento
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProcessModelData;