"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getStorage, ref as storageRef, listAll, getDownloadURL, getMetadata, deleteObject } from 'firebase/storage';
import axios from 'axios';
import app from './firebase';
import { API_URL_BIM } from '@/server';

interface FileItem {
  _id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  uploadDate: string;
  size: number;
  ref: string;
  mongoId?: string;
}

interface FirebaseFileListProps {
  folderPath?: string;
  onSelectFiles?: (selectedUrls: string[]) => void;
  onFilesLoad?: (files: FileItem[]) => void;
  filterExtensions?: string[] | null;
  onDeleteSuccess?: () => void;
}

export interface FirebaseFileListMethods {
  loadFileList: () => Promise<void>;
  getSelectedFiles: () => string[];
}

const FirebaseFileList = forwardRef<FirebaseFileListMethods, FirebaseFileListProps>(({
  folderPath = 'uploads',
  onSelectFiles,
  onFilesLoad,
  filterExtensions = null,
  onDeleteSuccess
}, componentRef) => {
  const storage = getStorage(app);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Función para comprobar si el archivo debe ser mostrado basado en su extensión
  const shouldShowFile = (fileName: string): boolean => {
    if (!filterExtensions || filterExtensions.length === 0) return true;
    
    const lowerFileName = fileName.toLowerCase();
    return filterExtensions.some(ext => lowerFileName.endsWith(ext));
  };

  // Exponer métodos a través de ref
  useImperativeHandle(componentRef, () => ({
    loadFileList,
    getSelectedFiles: () => Array.from(selectedFiles)
  }));

  // Cargar la lista de archivos al iniciar
  useEffect(() => {
    loadFileList();
  }, [folderPath]);

  // Función optimizada para buscar el MongoDB ID de un modelo
  const findMongoIdByFileUrl = async (fileUrl: string): Promise<string | null> => {
    try {
      console.log('🔍 Buscando modelo en MongoDB por URL:', fileUrl);
      
      const response = await axios.get(`${API_URL_BIM}/models/find-by-url`, {
        params: { fileUrl },
        withCredentials: true
      });
      
      if (response.data?.status === 'success' && response.data?.data?.model) {
        const mongoId = response.data.data.model._id;
        console.log('✅ Modelo encontrado en MongoDB:', mongoId);
        return mongoId;
      }
      
      console.log('⚠️ No se encontró modelo en MongoDB para esta URL');
      return null;
    } catch (err: any) {
      console.warn('❌ Error al buscar modelo en MongoDB:', err.response?.data?.message || err.message);
      return null;
    }
  };

  // Función para eliminar modelo de MongoDB usando diferentes estrategias
  const deleteFromMongoDB = async (fileRef: string, fileUrl: string): Promise<boolean> => {
    let deleted = false;

    try {
      // 1. Intentar buscar y eliminar por URL
      const mongoId = await findMongoIdByFileUrl(fileUrl);
      
      if (mongoId) {
        console.log('🗑️ Eliminando modelo de MongoDB:', mongoId);
        
        // Primero eliminar elementos asociados
        try {
          const elementsResponse = await axios.delete(`${API_URL_BIM}/models/elements/model/${mongoId}`, {
            withCredentials: true
          });
          console.log('✅ Elementos eliminados:', elementsResponse.data);
        } catch (elementsErr: any) {
          console.warn('⚠️ Error al eliminar elementos (continuando):', elementsErr.response?.data?.message || elementsErr.message);
        }
        
        // Luego eliminar el modelo
        try {
          const modelResponse = await axios.delete(`${API_URL_BIM}/models/${mongoId}`, {
            withCredentials: true
          });
          console.log('✅ Modelo eliminado de MongoDB:', modelResponse.data);
          deleted = true;
        } catch (modelErr: any) {
          console.error('❌ Error al eliminar modelo:', modelErr.response?.data?.message || modelErr.message);
        }
      }

      // 2. Si no se encontró por URL, intentar por ruta de Firebase
      if (!deleted) {
        console.log('🔄 Intentando eliminar por ruta de Firebase:', fileRef);
        
        try {
          const pathResponse = await axios.post(`${API_URL_BIM}/models/delete-by-path`, {
            firebasePath: fileRef
          }, {
            withCredentials: true
          });
          
          if (pathResponse.data?.status === 'success') {
            console.log('✅ Modelo eliminado por ruta:', pathResponse.data);
            deleted = true;
          }
        } catch (pathErr: any) {
          console.warn('⚠️ No se pudo eliminar por ruta:', pathErr.response?.data?.message || pathErr.message);
        }
      }

      return deleted;
    } catch (error: any) {
      console.error('❌ Error general al eliminar de MongoDB:', error);
      return false;
    }
  };

  // Función para cargar la lista de archivos desde Firebase Storage
  const loadFileList = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Definir las carpetas donde buscar archivos
    const foldersToSearch = [
      'uploads',
      'projectfiles/Modelos'
    ];
    
    console.log(`📁 Cargando archivos de múltiples carpetas:`, foldersToSearch);
    
    // Array para almacenar todos los archivos de todas las carpetas
    let allFileDetails: FileItem[] = [];
    
    // Buscar en cada carpeta
    for (const folder of foldersToSearch) {
      try {
        console.log(`📂 Buscando en carpeta: ${folder}`);
        
        // Obtener referencia a la carpeta
        const folderReference = storageRef(storage, folder);
        
        // Listar todos los archivos en la carpeta
        const result = await listAll(folderReference);
        
        // Filtrar archivos según extensiones si es necesario
        const filteredItems = filterExtensions 
          ? result.items.filter(item => shouldShowFile(item.name))
          : result.items;
        
        console.log(`📄 Archivos encontrados en ${folder}: ${filteredItems.length}`);
        
        // Crear array para almacenar los detalles de los archivos de esta carpeta
        const fileDetailsPromises = filteredItems.map(async (itemRef) => {
          try {
            // Obtener URL de descarga
            const url = await getDownloadURL(itemRef);
            
            // Obtener metadata del archivo
            let fileType = "application/octet-stream";
            let size = 0;
            let timeCreated = new Date().toISOString();
            
            try {
              const metadata = await getMetadata(itemRef);
              fileType = metadata.contentType || fileType;
              size = metadata.size || 0;
              timeCreated = metadata.timeCreated || timeCreated;
            } catch (metaErr) {
              console.warn(`⚠️ No se pudo obtener metadata para ${itemRef.name}:`, metaErr);
            }
            
            // Generar un ID único para esta instancia
            const uniqueId = `firebase_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            // Crear información del archivo
            return {
              _id: uniqueId,
              name: itemRef.name,
              fileUrl: url,
              fileType: fileType,
              uploadDate: timeCreated,
              size: size,
              ref: itemRef.fullPath
            };
          } catch (err) {
            console.error(`❌ Error procesando archivo ${itemRef.name}:`, err);
            return null;
          }
        });
        
        // Esperar a que todas las promesas de esta carpeta se resuelvan y filtrar los nulos
        const folderFileDetails = (await Promise.all(fileDetailsPromises)).filter(
          (file): file is FileItem => file !== null
        );
        
        // Agregar los archivos de esta carpeta al array general
        allFileDetails = [...allFileDetails, ...folderFileDetails];
        
      } catch (folderErr: any) {
        console.warn(`⚠️ Error al acceder a la carpeta ${folder}:`, folderErr.message);
        // Continuar con la siguiente carpeta si hay error
      }
    }
    
    // Ordenar todos los archivos por fecha de subida (más reciente primero)
    allFileDetails.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
    
    // Actualizar estado con todos los archivos obtenidos
    setFiles(allFileDetails);
    
    // Notificar a la aplicación principal si hay handler
    if (onFilesLoad && allFileDetails.length > 0) {
      onFilesLoad(allFileDetails);
    }

    console.log(`✅ Archivos cargados exitosamente: ${allFileDetails.length}`);
    
  } catch (err: any) {
    console.error('❌ Error al cargar la lista de archivos:', err);
    setError(`Error al cargar archivos: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  // Manejar eliminación completa de archivo (Firebase + MongoDB)
  const handleDeleteFile = async (fileRef: string, fileId: string, fileUrl: string) => {
    try {
      setDeleteLoading(fileId);
      console.log(`🗑️ Iniciando eliminación completa de archivo: ${fileRef}`);
      
      // 1. Eliminar de MongoDB primero (para tener mejor logging)
      const mongoDeleted = await deleteFromMongoDB(fileRef, fileUrl);
      
      // 2. Eliminar el archivo de Firebase Storage
      console.log('🔥 Eliminando archivo de Firebase Storage...');
      const fileReference = storageRef(storage, fileRef);
      await deleteObject(fileReference);
      console.log('✅ Archivo eliminado de Firebase Storage');
      
      // 3. Actualizar estado local
      setFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
      
      // 4. Eliminar de la selección si estaba seleccionado
      setSelectedFiles(prevSelected => {
        if (prevSelected.has(fileUrl)) {
          const newSelected = new Set(prevSelected);
          newSelected.delete(fileUrl);
          return newSelected;
        }
        return prevSelected;
      });
      
      // 5. Mostrar resultado de la operación
      if (mongoDeleted) {
        console.log('✅ Eliminación completa exitosa (Firebase + MongoDB)');
        setError(null); // Limpiar errores previos
      } else {
        console.log('⚠️ Archivo eliminado de Firebase, pero no se encontró en MongoDB');
        setError('Archivo eliminado de Firebase. No se encontró registro en la base de datos.');
      }
      
      // 6. Llamar al callback de éxito
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
      
    } catch (err: any) {
      console.error('❌ Error durante la eliminación:', err);
      
      if (err.code === 'storage/unauthorized') {
        setError('No tienes permisos para eliminar este archivo');
      } else if (err.code === 'storage/object-not-found') {
        setError('El archivo ya no existe en Firebase Storage');
      } else {
        setError(`Error al eliminar el archivo: ${err.message}`);
      }
    } finally {
      setDeleteLoading(null);
    }
  };

  // Manejar selección de un archivo
  const handleFileSelection = (url: string) => {
    setSelectedFiles(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(url)) {
        newSelected.delete(url);
      } else {
        newSelected.add(url);
      }
      return newSelected;
    });
  };

  // Manejar la carga de archivos seleccionados
  const handleUseSelectedFiles = () => {
    const selectedUrls = Array.from(selectedFiles);
    if (selectedUrls.length === 0) {
      setError('Por favor, selecciona al menos un archivo');
      return;
    }
    
    if (onSelectFiles) {
      onSelectFiles(selectedUrls);
    }
  };

  // Obtener icono según tipo de archivo
  const getFileIcon = (fileName: string, fileType: string) => {
    const lowerFileName = fileName.toLowerCase();
    
    if (lowerFileName.endsWith('.pdf')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    } else if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg') || lowerFileName.endsWith('.png') || lowerFileName.endsWith('.gif')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    } else if (lowerFileName.endsWith('.doc') || lowerFileName.endsWith('.docx')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (lowerFileName.endsWith('.xls') || lowerFileName.endsWith('.xlsx')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5zm9 6a1 1 0 10-2 0v4a1 1 0 102 0v-4zm-4-3a1 1 0 100 2h2a1 1 0 100-2H10z" clipRule="evenodd" />
        </svg>
      );
    } else if (lowerFileName.endsWith('.frag') || lowerFileName.endsWith('.glb') || lowerFileName.endsWith('.gltf') || lowerFileName.endsWith('.obj') || lowerFileName.endsWith('.ifc')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V6z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filtrar archivos basado en la búsqueda
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* Barra de búsqueda y filtros */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1 mr-2">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Buscar archivos..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button 
          onClick={() => loadFileList()}
          disabled={loading}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-3 rounded transition"
          title="Refrescar lista"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="ml-2 text-red-200 hover:text-white flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Información de selección y acciones */}
      {selectedFiles.size > 0 && (
        <div className="mb-4 bg-indigo-900/20 rounded-lg p-3 border border-indigo-600">
          <div className="flex justify-between items-center">
            <div className="text-sm text-indigo-300">
              {selectedFiles.size} {selectedFiles.size === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded transition"
              >
                Limpiar
              </button>
              <button
                onClick={handleUseSelectedFiles}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-2 rounded transition"
              >
                Usar seleccionados
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de archivos */}
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-300">Cargando archivos...</span>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-gray-700 rounded-lg p-8 text-center text-gray-300">
          {files.length === 0 ? 
            'No se encontraron archivos en el almacenamiento.' : 
            'No se encontraron archivos que coincidan con la búsqueda.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th scope="col" className="w-10 px-3 py-3">
                  <span className="sr-only">Seleccionar</span>
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Nombre
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Tamaño
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredFiles.map((file) => (
                <tr 
                  key={file._id}
                  className={`hover:bg-gray-700 transition ${selectedFiles.has(file.fileUrl) ? 'bg-indigo-900/20' : ''}`}
                >
                  <td className="px-3 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.fileUrl)}
                      onChange={() => handleFileSelection(file.fileUrl)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div 
                      className="flex items-center text-sm text-white cursor-pointer"
                      onClick={() => handleFileSelection(file.fileUrl)}
                    >
                      <span className="mr-2">
                        {getFileIcon(file.name, file.fileType)}
                      </span>
                      <span className="truncate max-w-xs" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300">
                    {new Date(file.uploadDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right">
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 text-sm mr-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(file.fileUrl);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 text-sm mr-3"
                      title="Copiar URL al portapapeles"
                    >
                      Copiar URL
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.ref, file._id, file.fileUrl);
                      }}
                      disabled={deleteLoading === file._id}
                      className={`text-red-400 hover:text-red-300 text-sm ${deleteLoading === file._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Eliminar archivo completo (Firebase + Base de datos)"
                    >
                      {deleteLoading === file._id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

FirebaseFileList.displayName = 'FirebaseFileList';

export default FirebaseFileList;