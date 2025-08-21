"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { API_URL_BIM } from '@/server';
import { BIMModel } from './types';

interface BIMHubDetailsProps {
  model: BIMModel | null;
}

const BIMHubDetails = ({ model }: BIMHubDetailsProps) => {
  const [elementStats, setElementStats] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuración de Axios
  const api = axios.create({
    baseURL: API_URL_BIM,
    withCredentials: true
  });

  // Cargar estadísticas de elementos cuando se selecciona un modelo
  useEffect(() => {
    if (!model) {
      setElementStats(null);
      return;
    }
    
    const fetchElementStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data } = await api.get(`/models/${model._id}/categories`);
        setElementStats(data.data || data || []);
        
      } catch (err) {
        console.error('Error loading element stats:', err);
        setError('Error al cargar las categorías');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchElementStats();
  }, [model]);

  /**
   * Formatea una fecha a formato legible
   * @param dateString - Fecha en formato string o timestamp
   * @returns Fecha formateada o 'N/A' si no es válida
   */
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };
  
  // Estado cuando no hay modelo seleccionado
  if (!model) {
    return (
      <div className="text-center py-12 text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-lg font-medium">Seleccione un modelo</h3>
        <p className="mt-2 text-sm">Seleccione un modelo de la lista para ver sus detalles</p>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-slate-100">{model.name}</h2>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-lg font-bold hover:text-red-300 transition-colors"
            aria-label="Cerrar mensaje de error"
          >
            &times;
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Información general del modelo */}
        <div>
          <h3 className="text-sm font-medium text-slate-400">Información general</h3>
          <div className="mt-2 bg-gray-700 rounded-md p-3 text-slate-300">
            <p className="mb-1">
              <span className="font-medium text-slate-400">ID:</span> {model._id}
            </p>
            {model.description && (
              <p className="mb-1">
                <span className="font-medium text-slate-400">Descripción:</span> {model.description}
              </p>
            )}
            <p className="mb-1">
              <span className="font-medium text-slate-400">Tipo:</span> {model.fileType || 'N/A'}
            </p>
            <p className="mb-1">
              <span className="font-medium text-slate-400">Cargado:</span> {formatDate(model.uploadDate)}
            </p>
            <p>
              <span className="font-medium text-slate-400">Modificado:</span> {formatDate(model.lastModified)}
            </p>
          </div>
        </div>
        
        {/* Sección de categorías */}
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="w-5 h-5 border-2 border-t-indigo-600 border-gray-500 rounded-full animate-spin"></div>
            <span className="ml-2 text-slate-300 text-sm">Cargando categorías...</span>
          </div>
        ) : elementStats && elementStats.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium text-slate-400">Categorías</h3>
            <div className="mt-2 bg-gray-700 rounded-md p-3">
              <div className="flex flex-wrap gap-2">
                {elementStats.map((category, index) => (
                  <span 
                    key={`${category}-${index}`} 
                    className="text-sm bg-indigo-700/30 text-indigo-300 px-2 py-1 rounded-md"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-slate-400">Categorías</h3>
            <div className="mt-2 bg-gray-700 rounded-md p-3 text-slate-400 text-sm">
              No hay información de categorías disponible
            </div>
          </div>
        )}
        
        {/* Acciones del modelo */}
        <div className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link 
              href={`/dashboard/model-viewer/${model._id}`}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition text-center"
              aria-label={`Visualizar modelo ${model.name}`}
            >
              Visualizar modelo
            </Link>
            {model.fileUrl && (
              <a 
                href={model.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition text-center"
                aria-label={`Descargar modelo ${model.name}`}
              >
                Descargar
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BIMHubDetails;