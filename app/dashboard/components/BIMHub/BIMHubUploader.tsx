"use client";

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { API_URL_BIM } from '@/server';


interface SimpleUploaderProps {
  onUploadComplete?: (fileUrl: string, modelId: string) => void;
  compact?: boolean;
}

const SimpleUploader: React.FC<SimpleUploaderProps> = ({
  onUploadComplete,
  compact = true
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [modelId, setModelId] = useState<string | null>(null);



  // Manejo de archivos mediante drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  }, []);

  // Manejo de selección de archivo mediante input
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  }, []);

  // Procesar subida de archivo usando Axios
  // Versión de handleUpload con debugging detallado
const handleUpload = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  
  if (!file) {
    setError('Por favor, seleccione un archivo');
    return;
  }

  try {
    setIsUploading(true);
    setError(null);
    setProgress(0);
    
    // Log detallado del archivo
    console.log('=== INICIANDO UPLOAD ===');
    console.log('Archivo:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    });
    
    // Crear FormData para enviar al servidor
    const formData = new FormData();
    formData.append('file', file);
    
    // Log de la URL del endpoint
    const uploadUrl = `${API_URL_BIM}/models/upload-to-firebase`;
    console.log('URL de upload:', uploadUrl);
    console.log('Enviando FormData con archivo de', (file.size / (1024 * 1024)).toFixed(2), 'MB');
    
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      withCredentials: true,
      timeout: 600000, // 10 minutos
      maxContentLength: 200 * 1024 * 1024, // 200MB
      maxBodyLength: 200 * 1024 * 1024, // 200MB
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentage);
          
          // Log cada 10% de progreso
          if (percentage % 10 === 0) {
            console.log(`📊 Progreso: ${percentage}% (${(progressEvent.loaded / (1024 * 1024)).toFixed(2)} MB de ${(progressEvent.total / (1024 * 1024)).toFixed(2)} MB)`);
          }
        }
      }
    });
    
    console.log('✅ Respuesta exitosa del servidor:', response.data);
    
    // Procesar respuesta exitosa
    setProgress(100);
    setUploadedFileUrl(response.data.data.file.url);
    setModelId(response.data.data.model._id);
    
    if (onUploadComplete) {
      onUploadComplete(response.data.data.file.url, response.data.data.model._id);
    }
  } catch (err: any) {
    console.error('❌ ERROR DETALLADO:', {
      message: err.message,
      code: err.code,
      status: err.response?.status,
      statusText: err.response?.statusText,
      responseData: err.response?.data,
      responseHeaders: err.response?.headers,
      config: {
        url: err.config?.url,
        method: err.config?.method,
        timeout: err.config?.timeout,
        maxContentLength: err.config?.maxContentLength
      }
    });
    
    // Extraer mensaje de error específico del servidor
    let errorMessage = 'Error al subir archivo';
    
    if (err.response?.status === 500) {
      // Error 500 - problema del servidor
      const serverError = err.response?.data?.message || 
                         err.response?.data?.error || 
                         'Error interno del servidor';
      
      errorMessage = `Error del servidor (500): ${serverError}`;
      
      // Sugerencias según el error del servidor
      if (serverError.includes('timeout') || serverError.includes('time')) {
        errorMessage += ' - El archivo puede ser demasiado grande o la conexión muy lenta.';
      } else if (serverError.includes('memory') || serverError.includes('heap')) {
        errorMessage += ' - El servidor no tiene suficiente memoria para procesar el archivo.';
      } else if (serverError.includes('firebase') || serverError.includes('storage')) {
        errorMessage += ' - Error de conexión con Firebase Storage.';
      }
      
    } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      errorMessage = 'Tiempo de carga agotado. El archivo es muy grande o la conexión es lenta.';
    } else if (err.response?.status === 413) {
      errorMessage = 'El archivo es demasiado grande para el servidor.';
    } else if (err.response?.status === 502 || err.response?.status === 504) {
      errorMessage = 'Error del servidor. Intente con un archivo más pequeño.';
    } else {
      errorMessage = err.response?.data?.message || 
                    err.response?.data?.error || 
                    err.message || 
                    'Error al subir archivo';
    }
    
    setError(errorMessage);
  } finally {
    setIsUploading(false);
  }
}, [file, onUploadComplete]);

  // Reiniciar formulario
  const resetForm = useCallback(() => {
    setFile(null);
    setUploadedFileUrl(null);
    setModelId(null);
    setProgress(0);
    setError(null);
  }, []);

  // Obtener ícono según tipo de archivo
  const getFileIcon = useCallback(() => {
    if (!file) return null;
    
    const fileType = file.type;
    
    if (fileType.includes('image')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-emerald-400">
          <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
        </svg>
      );
    } else if (fileType.includes('pdf')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-400">
          <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
          <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
        </svg>
      );
    } else if (fileType.includes('video')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-400">
          <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
        </svg>
      );
    } else if (fileType.includes('audio')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-400">
          <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
          <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-400">
          <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6.905 9.97a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72V18a.75.75 0 001.5 0v-4.19l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
          <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
        </svg>
      );
    }
  }, [file]);

  return (
    <div className={`transition-all ${compact ? "" : "max-w-md mx-auto p-6 bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-xl ring-1 ring-gray-700"}`}>
      {!compact && <h1 className="text-2xl font-bold mb-6 text-white">Carga de Archivos</h1>}
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg mb-4 text-sm animate-fade-in">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-red-400">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
      {uploadedFileUrl ? (
        <div className="bg-emerald-500/20 border border-emerald-500 p-4 rounded-lg mb-4 animate-fade-in">
          <div className="flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-emerald-400">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
            <h2 className="text-emerald-200 font-semibold text-sm">¡Archivo subido exitosamente!</h2>
          </div>
          
          {!compact && (
            <div className="mt-2 p-2 bg-emerald-900/30 rounded border border-emerald-800 break-all">
              <p className="text-emerald-200 text-xs">URL: {uploadedFileUrl}</p>
              {modelId && (
                <p className="text-emerald-200 text-xs mt-1">ID del modelo: {modelId}</p>
              )}
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <button 
              onClick={resetForm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg transition-all duration-200 text-sm flex items-center shadow-md hover:shadow-lg active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2">
                <path fillRule="evenodd" d="M9.75 6.75h-3a3 3 0 00-3 3v7.5a3 3 0 003 3h7.5a3 3 0 003-3v-7.5a3 3 0 00-3-3h-3V1.5a.75.75 0 00-1.5 0v5.25zm0 0h1.5v5.69l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72V6.75z" clipRule="evenodd" />
              </svg>
              Subir otro archivo
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-4 transition-all ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-500/10' 
                : 'border-gray-600 hover:border-indigo-400 hover:bg-gray-700/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center py-4">
              {file ? (
                <div className="flex items-center bg-gray-700/60 p-3 rounded-lg w-full">
                  <div className="mr-3">
                    {getFileIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFile(null)}
                    className="ml-2 p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-gray-500 mb-2">
                    <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6.905 9.97a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72V18a.75.75 0 001.5 0v-4.19l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
                    <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
                  </svg>
                  <p className="text-sm text-gray-400 text-center mb-2">
                    <span className="font-medium">Arrastra y suelta</span> tu archivo aquí o
                  </p>
                  <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-all text-sm inline-flex items-center shadow-md hover:shadow-lg">
                    <span>Seleccionar archivo</span>
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
          
          {progress > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1 font-medium">
                <span>Progreso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isUploading || !file}
            className={`w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-white 
              shadow-md transition-all duration-200
              ${isUploading || !file 
                ? 'bg-gray-600 opacity-50 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:shadow-lg active:scale-95'
              }`}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Subiendo...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                  <path d="M11.47 1.72a.75.75 0 011.06 0l3 3a.75.75 0 01-1.06 1.06l-1.72-1.72V7.5h-1.5V4.06L9.53 5.78a.75.75 0 01-1.06-1.06l3-3zM11.25 7.5V15a.75.75 0 001.5 0V7.5h3.75a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9a3 3 0 013-3h3.75z" />
                </svg>
                Subir archivo
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

// Animaciones CSS para el componente
const styles = `
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}
`;

// Añadir estilos al documento
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default SimpleUploader;