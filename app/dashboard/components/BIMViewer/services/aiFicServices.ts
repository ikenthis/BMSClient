// services/aiFicServices.ts
import axios, { AxiosResponse } from 'axios';
import { API_COLLECTION } from '@/server';

// URL base para la API
const API_URL = API_COLLECTION || 'http://localhost:4000/api';

// Crear una instancia de Axios con configuración
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Tipos para respuestas
interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

// Interfaces específicas para FacilitICP
export interface ElementoAnalizado {
  elementUuid: string;
  elementName: string;
  elementType: string;
  category?: string;
  installationDate?: string;
  nextMaintenanceDate?: string;
  history?: MaintenanceRecord[];
  properties?: Record<string, any>;
  analysis?: ElementAnalysis;
}

export interface MaintenanceRecord {
  date: string;
  action: 'inspection' | 'repair' | 'replacement';
  description: string;
  technician?: string;
  cost?: number;
}

export interface ElementAnalysis {
  remainingLifespan?: number;
  condition: 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
  predictedFailures?: PredictedFailure[];
}

export interface PredictedFailure {
  component: string;
  probability: number;
  estimatedTime: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface EstadisticasMantenimiento {
  estadosMantenimiento: {
    _id: 'vencido' | 'proximo' | 'programado' | 'sinProgramar';
    cantidad: number;
  }[];
  estadisticasPorCategoria?: {
    _id: string;
    cantidad: number;
    equiposConMantenimientoVencido: number;
  }[];
}

export interface ContextoAnalisis {
  selectedElement?: any;
  modelInfo?: any;
  elementsData?: any;
  messageHistory?: {
    role: string;
    content: string;
  }[];
}

/**
 * Servicio para interactuar con el backend de FacilitICP
 */
const aiFicServices = {
  /**
   * Procesar una consulta general a FacilitICP
   * @param query - Consulta del usuario
   * @param context - Datos de contexto (modelo, elemento seleccionado, etc.)
   * @returns Respuesta del servicio
   */
  procesarConsulta: async (query: string, context: ContextoAnalisis = {}): Promise<AxiosResponse<ApiResponse<{ resultado: string }>>> => {
    try {
      return await apiClient.post('/api/predictive-agent/consulta', {
        query,
        context
      });
    } catch (error) {
      console.error('Error al procesar consulta FacilitICP:', error);
      throw error;
    }
  },

  /**
   * Generar un reporte de mantenimiento predictivo
   * @returns Reporte generado
   */
  generarReporteMantenimiento: async (): Promise<AxiosResponse<ApiResponse<{ reporte: string }>>> => {
    try {
      return await apiClient.get('/api/predictive-agent/reportes/mantenimiento-predictivo');
    } catch (error) {
      console.error('Error al generar reporte de mantenimiento:', error);
      throw error;
    }
  },

  /**
   * Analizar un elemento específico
   * @param elementUuid - UUID del elemento a analizar
   * @returns Análisis del elemento
   */
  analizarElemento: async (elementUuid: string): Promise<AxiosResponse<ApiResponse<{ analisis: string }>>> => {
    try {
      return await apiClient.get(`/api/predictive-agent/equipos/${elementUuid}/analisis`);
    } catch (error) {
      console.error('Error al analizar elemento:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de mantenimiento
   * @returns Estadísticas de mantenimiento
   */
  obtenerEstadisticas: async (): Promise<AxiosResponse<ApiResponse<{ data: EstadisticasMantenimiento }>>> => {
    try {
      return await apiClient.get('/api/predictive-agent/estadisticas/mantenimiento');
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  },

  /**
   * Analizar consumo energético
   * @param datos - Datos para el análisis
   * @returns Análisis de consumo energético
   */
  analizarConsumoEnergetico: async (datos: Record<string, any> = {}): Promise<AxiosResponse<ApiResponse<{ analisis: string }>>> => {
    try {
      return await apiClient.post('/api/predictive-agent/analisis/consumo-energetico', {
        datos
      });
    } catch (error) {
      console.error('Error al analizar consumo energético:', error);
      throw error;
    }
  },

  /**
   * Generar un calendario de mantenimiento optimizado
   * @param periodo - Periodo del calendario (mensual, trimestral, anual)
   * @returns Calendario generado
   */
  generarCalendarioMantenimiento: async (periodo: 'mensual' | 'trimestral' | 'anual' = 'trimestral'): Promise<AxiosResponse<ApiResponse<{ calendario: string }>>> => {
    try {
      return await apiClient.get(`/api/predictive-agent/calendario-mantenimiento?periodo=${periodo}`);
    } catch (error) {
      console.error('Error al generar calendario de mantenimiento:', error);
      throw error;
    }
  },

  /**
   * Recomendar mejoras en equipamiento
   * @param filtros - Filtros para las recomendaciones
   * @returns Recomendaciones de mejoras
   */
  recomendarMejoras: async (filtros: Record<string, any> = {}): Promise<AxiosResponse<ApiResponse<{ recomendaciones: string }>>> => {
    try {
      return await apiClient.post('/api/predictive-agent/recomendaciones/mejoras', {
        filtros
      });
    } catch (error) {
      console.error('Error al recomendar mejoras:', error);
      throw error;
    }
  }
};

export default aiFicServices;