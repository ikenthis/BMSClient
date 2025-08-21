"use client";

import React, { useState, useEffect, useRef } from 'react';
import SimpleFirebaseUploader from './BIMHubUploader';
import FirebaseModelList from './BIMHubModelList';

interface ModelManagerPageProps {
  onModelSelect?: (modelUrl: string) => void;
  folderPath?: string;
}

const ModelManagerPage: React.FC<ModelManagerPageProps> = ({
  onModelSelect,
  folderPath = 'uploads'
}) => {
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const listRef = useRef<any>(null);

  // Función que se llamará cuando se complete una carga
  const handleUploadComplete = (fileUrl: string) => {
    console.log("Archivo subido exitosamente:", fileUrl);
    setUploadSuccess(true);
    
    // Refrescar la lista después de un breve retraso
    setTimeout(() => {
      if (listRef.current && listRef.current.loadModelList) {
        listRef.current.loadModelList();
      }
      setUploadSuccess(false);
    }, 2000);
  };

  // Función para manejar la selección de modelos
  const handleSelectFiles = (urls: string[]) => {
    setSelectedUrls(urls);
    
    // Si hay una función de callback para selección y se seleccionó solo un modelo
    if (onModelSelect && urls.length === 1) {
      onModelSelect(urls[0]);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold text-white text-center mb-8">
        Gestor de Modelos 3D
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Panel izquierdo - Uploader */}
        <div className="md:col-span-1">
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-700 px-4 py-3">
              <h2 className="font-bold text-white text-xl">Subir nuevo modelo</h2>
            </div>
            <div className="p-4">
              <SimpleFirebaseUploader 
                onUploadComplete={handleUploadComplete}
                folderPath={folderPath}
              />
            </div>
          </div>
          
          {/* Panel de ayuda */}
          <div className="mt-4 bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="font-bold text-white mb-2">Formatos compatibles</h3>
            <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
              <li>.frag - Fragments (optimizado)</li>
              <li>.glb / .gltf - GL Transmission Format</li>
              <li>.ifc - Industry Foundation Classes</li>
              <li>.obj - Wavefront OBJ</li>
            </ul>
            
            <h3 className="font-bold text-white mt-4 mb-2">Instrucciones</h3>
            <ol className="text-sm text-gray-300 list-decimal pl-5 space-y-1">
              <li>Seleccione un archivo de modelo 3D</li>
              <li>Espere a que se complete la carga</li>
              <li>El modelo aparecerá en la lista de la derecha</li>
              <li>Seleccione el modelo para visualizarlo</li>
            </ol>
          </div>
        </div>
        
        {/* Panel derecho - Lista de modelos */}
        <div className="md:col-span-2">
          <div className="bg-gray-800 rounded-lg shadow-lg">
            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
              <h2 className="font-bold text-white text-xl">Modelos disponibles</h2>
              {uploadSuccess && (
                <div className="bg-green-500 text-white text-sm px-3 py-1 rounded-full animate-pulse">
                  ¡Archivo subido exitosamente!
                </div>
              )}
            </div>
            <div className="p-4">
              <FirebaseModelList
                ref={listRef}
                folderPath={folderPath}
                onSelectFiles={handleSelectFiles}

              />
            </div>
          </div>
          
          {/* Sección de acciones con los modelos seleccionados */}
          {selectedUrls.length > 0 && (
            <div className="mt-4 bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="font-bold text-white mb-3">Acciones para modelos seleccionados</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    if (onModelSelect && selectedUrls.length > 0) {
                      onModelSelect(selectedUrls[0]);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded transition"
                >
                  Visualizar modelo
                </button>
                
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedUrls.join('\n'));
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition"
                >
                  Copiar URLs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelManagerPage;