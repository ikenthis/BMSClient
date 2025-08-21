// src/services/predictiveAgentService.ts
import axios, { AxiosResponse } from 'axios';
import { getToken } from '../../../../auth/authService'; // Asegúrate de que la ruta sea correcta
import { API_COLLECTION } from '@/server';

const API_URL = process.env.API_COLLECTION || 'http://localhost:4000/api';

// Definir interfaces para tipado
export interface ContextData {
  elementUuid?: string;
  spaceGuid?: string;
  artworkId?: string;
  category?: string;
}

export interface AgentResponse {
  status: string;
  resultado: string;
}

export interface AnalysisResponse {
  status: string;
  analisis: string;
}

export interface RecommendationsResponse {
  status: string;
  recomendaciones: string;
}

export interface MaintenanceReportResponse {
  status: string;
  reporte: string;
}

export interface MaintenanceCalendarResponse {
  status: string;
  calendario: string;
}

// Configurar interceptor para incluir token de autorización
axios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Consulta general al agente predictivo
export const consultarAgente = async (query: string, contextData: ContextData = {}): Promise<AgentResponse> => {
  try {
    const response: AxiosResponse<AgentResponse> = await axios.post(
      `${API_URL}/predictive-agent/consulta`, 
      { query, contextData }
    );
    return response.data;
  } catch (error) {
    console.error('Error en consultarAgente:', error);
    throw error;
  }
};

// Obtener análisis de un elemento específico
export const obtenerAnalisisElemento = async (elementUuid: string): Promise<AnalysisResponse> => {
  try {
    const response: AxiosResponse<AnalysisResponse> = await axios.get(
      `${API_URL}/predictive-agent/equipos/${elementUuid}/analisis`
    );
    return response.data;
  } catch (error) {
    console.error('Error en obtenerAnalisisElemento:', error);
    throw error;
  }
};

// Obtener análisis de un espacio
export const obtenerAnalisisEspacio = async (spaceGuid: string, query: string = ''): Promise<AnalysisResponse> => {
  try {
    const response: AxiosResponse<AnalysisResponse> = await axios.post(
      `${API_URL}/predictive-agent/espacios/${spaceGuid}/analisis`,
      { query }
    );
    return response.data;
  } catch (error) {
    console.error('Error en obtenerAnalisisEspacio:', error);
    throw error;
  }
};

// Obtener recomendaciones para una obra de arte
export const obtenerRecomendacionesObra = async (itemId: string): Promise<RecommendationsResponse> => {
  try {
    const response: AxiosResponse<RecommendationsResponse> = await axios.get(
      `${API_URL}/predictive-agent/obras-arte/${itemId}/recomendaciones`
    );
    return response.data;
  } catch (error) {
    console.error('Error en obtenerRecomendacionesObra:', error);
    throw error;
  }
};

// Obtener reporte de mantenimiento predictivo
export const obtenerReporteMantenimiento = async (): Promise<MaintenanceReportResponse> => {
  try {
    const response: AxiosResponse<MaintenanceReportResponse> = await axios.get(
      `${API_URL}/predictive-agent/reportes/mantenimiento-predictivo`
    );
    return response.data;
  } catch (error) {
    console.error('Error en obtenerReporteMantenimiento:', error);
    throw error;
  }
};

// Obtener calendario de mantenimiento
export const obtenerCalendarioMantenimiento = async (periodo: string = 'trimestral'): Promise<MaintenanceCalendarResponse> => {
  try {
    const response: AxiosResponse<MaintenanceCalendarResponse> = await axios.get(
      `${API_URL}/predictive-agent/calendario-mantenimiento?periodo=${periodo}`
    );
    return response.data;
  } catch (error) {
    console.error('Error en obtenerCalendarioMantenimiento:', error);
    throw error;
  }
};

// Obtener análisis de consumo energético
export const obtenerAnalisisConsumoEnergetico = async (): Promise<AnalysisResponse> => {
  try {
    const response: AxiosResponse<AnalysisResponse> = await axios.get(
      `${API_URL}/predictive-agent/analisis/consumo-energetico`
    );
    return response.data;
  } catch (error) {
    console.error('Error en obtenerAnalisisConsumoEnergetico:', error);
    throw error;
  }
};