// services/aiAssistantService.ts
import axios, { AxiosResponse } from 'axios';
import { API_COLLECTION } from '@/server';

// Tipos para mensajes
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Tipo para el elemento seleccionado
export interface SelectedElement {
  id?: number | string;
  type?: string;
  name?: string;
  properties?: any;
  guid?: string | null;
  elementUuid?: string;
  elementName?: string;
  elementType?: string;
  category?: string;
  originalData?: any;
}

// Tipo para información del modelo
export interface ModelInfo {
  name?: string;
  type?: string;
  modelCount?: number;
  lastModified?: string;
}

// Tipo para el contexto enviado al asistente
export interface AssistantContext {
  selectedElement?: SelectedElement | null;
  modelInfo?: ModelInfo | null;
  elementsData?: {
    elementCounts?: Record<string, number>;
    elementTypes?: string[];
    totalElements?: number;
    properties?: Record<string, any[]>;
  } | null;
}

// Tipo para el contexto de conversación
export interface ConversationContext {
  lastMentionedElementType: string;
  mentionedElementTypes: Set<string>;
  questionCount: number;
  lastQuery: string;
  lastResponse: string;
  topics?: Set<string>;
}

// Tipo para respuestas de la API
interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

// Tipos específicos para IoT
export interface SensorData {
  sensorId: string;
  tipo: string;
  valor: number;
  timestamp: string;
  calidad: 'good' | 'warning' | 'critical' | 'error';
  espacio?: string;
}

export interface SystemStatus {
  timestamp: string;
  sensores: {
    total: number;
    activos: number;
    error: number;
    errorInMemory: number;
    inactive: number;
    running: number;
  };
  lecturas: {
    recentCount: number;
    rate: string;
  };
  alertas: {
    lastHour: number;
  };
  system: {
    uptime: number;
    isRunning: boolean;
    recoveryEnabled: boolean;
  };
}

export interface Anomaly {
  sensorId: string;
  sensorName: string;
  tipo: string;
  valor?: number;
  valorEsperado?: string;
  desviacion?: string;
  timestamp?: string;
  severidad: 'alta' | 'media' | 'baja';
  descripcion?: string;
}

// Tipos para reportes
export interface ReportConfig {
  tipo: string;
  periodo: string;
  incluirGraficos?: boolean;
  formato?: 'html' | 'pdf';
}

export interface ReportResult {
  fileName: string;
  filePath: string;
  previewUrl: string;
  downloadUrl: string;
  deleteUrl: string;
  tipo: string;
  fechaGeneracion: string;
  tamaño: number;
}

// URL base para la API
const API_URL_ASSISTANT = API_COLLECTION || 'http://localhost:4000/api';
console.log('API_URL_ASSISTANT para asistente IA:', API_URL_ASSISTANT);

// Crear una instancia de Axios con configuración
const apiClient = axios.create({
  baseURL: API_URL_ASSISTANT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Flag para modo demo (sin backend)
const DEMO_MODE = false; // Cambiar a false cuando el backend esté listo

// Inicializar el contexto de conversación desde localStorage
let conversationContext: ConversationContext;
try {
  const savedContext = localStorage.getItem('aiAssistantContext');
  if (savedContext) {
    const parsed = JSON.parse(savedContext);
    conversationContext = {
      lastMentionedElementType: parsed.lastMentionedElementType || '',
      mentionedElementTypes: new Set(parsed.mentionedElementTypes || []),
      questionCount: parsed.questionCount || 0,
      lastQuery: parsed.lastQuery || '',
      lastResponse: parsed.lastResponse || '',
      topics: new Set(parsed.topics || [])
    };
  } else {
    // Inicializar con valores por defecto
    conversationContext = {
      lastMentionedElementType: '',
      mentionedElementTypes: new Set<string>(),
      questionCount: 0,
      lastQuery: '',
      lastResponse: '',
      topics: new Set<string>()
    };
  }
} catch (e) {
  console.warn('Error al cargar contexto de conversación:', e);
  // Inicializar por defecto si hay error
  conversationContext = {
    lastMentionedElementType: '',
    mentionedElementTypes: new Set<string>(),
    questionCount: 0,
    lastQuery: '',
    lastResponse: '',
    topics: new Set<string>()
  };
}

// Función para guardar el contexto
const saveContext = () => {
  try {
    // Convertir Sets a arrays para guardar en JSON
    const contextToSave = {
      ...conversationContext,
      mentionedElementTypes: Array.from(conversationContext.mentionedElementTypes),
      topics: Array.from(conversationContext.topics || [])
    };
    localStorage.setItem('aiAssistantContext', JSON.stringify(contextToSave));
  } catch (e) {
    console.warn('Error al guardar contexto de conversación:', e);
  }
};

// Mapeo de nombres comunes a tipos IFC
const commonNameToIFCType: Record<string, string> = {
  "puerta": "IFCDOOR",
  "puertas": "IFCDOOR",
  "ventana": "IFCWINDOW",
  "ventanas": "IFCWINDOW",
  "muro": "IFCWALL",
  "muros": "IFCWALL",
  "pared": "IFCWALL",
  "paredes": "IFCWALL",
  "espacio": "IFCSPACE",
  "espacios": "IFCSPACE",
  "habitación": "IFCSPACE",
  "habitaciones": "IFCSPACE",
  "columna": "IFCCOLUMN",
  "columnas": "IFCCOLUMN",
  "viga": "IFCBEAM",
  "vigas": "IFCBEAM",
  "escalera": "IFCSTAIR",
  "escaleras": "IFCSTAIR"
};

// Mapeo de tipos IFC a nombres comunes (inverso)
const IFCTypeToCommonName: Record<string, string> = {};
for (const [commonName, ifcType] of Object.entries(commonNameToIFCType)) {
  if (!IFCTypeToCommonName[ifcType] || commonName.length > IFCTypeToCommonName[ifcType].length) {
    IFCTypeToCommonName[ifcType] = commonName;
  }
}

// Respuestas demo predefinidas (solo para fallback)
const demoResponses = {
  "default": "Como asistente de IA para facility management, puedo ayudarte con consultas sobre mantenimiento de edificios, optimización de espacios y gestión de instalaciones. ¿Puedes ser más específico sobre lo que necesitas?",
  "greeting": "¡Hola! ¿En qué puedo ayudarte hoy con la gestión de tus instalaciones? Puedo analizar la información de tu modelo BIM para proporcionarte insights valiosos.",
  "noData": "No tengo acceso a datos suficientes sobre el modelo actual. ¿Podrías cargar un modelo BIM o proporcionar más información sobre el tipo de elementos que te interesan?",
  "noElement": "No hay ningún elemento seleccionado actualmente. Por favor, selecciona un elemento del modelo para analizarlo."
};

// Simulación de retardo para el modo demo
const simulateDelay = (ms = 1500) => new Promise(resolve => setTimeout(resolve, ms));

// Función para detectar tipo de elemento IFC desde texto
function detectElementType(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  for (const [commonName, ifcType] of Object.entries(commonNameToIFCType)) {
    if (lowerText.includes(commonName)) {
      return ifcType;
    }
  }
  
  return null;
}

// Función para extraer propiedades relevantes de un elemento
function extractElementProperties(element: any): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Si no hay datos, devolver objeto vacío
  if (!element) return properties;
  
  // Recorremos las propiedades del elemento
  for (const [key, value] of Object.entries(element)) {
    // Ignorar propiedades internas o metadatos
    if (key.startsWith('_') || key === 'id' || key === 'guid' || key === 'elementUuid') continue;
    
    // Si es un objeto con .value, extraer el valor
    if (typeof value === 'object' && value !== null && 'value' in value) {
      properties[key] = value.value;
    } else if (typeof value !== 'function' && typeof value !== 'object') {
      // Si es un valor primitivo, incluirlo directamente
      properties[key] = value;
    }
  }
  
  return properties;
}

// Función principal para obtener respuesta inteligente
const getIntelligentResponse = (query: string, context: AssistantContext = {}): string => {
  // Verificar si hay datos de elementos
  const hasElementsData = context.elementsData && 
                         (context.elementsData.elementCounts || 
                          context.elementsData.properties);
  
  console.log("Contexto recibido en IA:", {
    hasSelectedElement: !!context.selectedElement,
    hasElementsData,
    elementTypesCount: context.elementsData?.elementTypes?.length || 0,
    totalElements: context.elementsData?.totalElements,
    query
  });
  
  // Si es la primera interacción
  if (conversationContext.questionCount === 0) {
    conversationContext.questionCount++;
    
    // Si hay datos del modelo, dar un saludo personalizado
    if (hasElementsData) {
      const totalElementCount = context.elementsData?.totalElements || 
        Object.values(context.elementsData?.elementCounts || {}).reduce((sum: number, count: any) => sum + count, 0);
      
      saveContext();
      return `¡Bienvenido a CrownGPT! Estoy analizando tu modelo BIM que contiene aproximadamente ${totalElementCount} elementos. Puedo ayudarte a comprender la información de tu modelo, analizar elementos específicos y proporcionar recomendaciones para mantenimiento y gestión. ¿En qué puedo asistirte hoy?`;
    }
    
    saveContext();
    return demoResponses.greeting;
  }
  
  // Incrementar contador
  conversationContext.questionCount++;
  
  // Guardar la consulta
  conversationContext.lastQuery = query;
  
  // Procesar la consulta (simplificado para el ejemplo)
  const response = "Esta es una respuesta de demostración. En el modo de producción, aquí se procesaría la consulta con IA real.";
  
  // Guardar la respuesta
  conversationContext.lastResponse = response;
  
  // Guardar contexto actualizado
  saveContext();
  
  return response;
};

// Servicio para el asistente IA
const aiAssistantService = {
  // ====== MÉTODOS EXISTENTES ======
  
  // Enviar mensaje al asistente
  sendMessage: async (
    query: string, 
    context: AssistantContext = {}, 
    history: { role: string; content: string }[] = []
  ): Promise<ApiResponse<{ response: string }>> => {
    console.log('Sending message to AI Assistant:', query);
    console.log('Context:', context);
    
    if (DEMO_MODE) {
      // Modo inteligente que usa los datos reales del modelo
      await simulateDelay(1500);
      return {
        status: 'success',
        data: {
          response: getIntelligentResponse(query, context)
        }
      };
    }
    
    try {
      const response: AxiosResponse<ApiResponse<{ response: string }>> = 
        await apiClient.post('/ai-assistant/query-assistant', {
          query,
          context,
          history: history.slice(-10) // Limitar a los últimos 10 mensajes
        });
      
      return response.data;
    } catch (error) {
      console.error('Error al comunicarse con el asistente IA:', error);
      throw error;
    }
  },

  // Generar predicción de mantenimiento
  predictMaintenance: async (
    elementId: string | number, 
    timeFrame: number
  ): Promise<ApiResponse<{ prediction: string }>> => {
    console.log(`Generando predicción de mantenimiento para elemento ${elementId} en ${timeFrame} meses`);
    
    if (DEMO_MODE) {
      await simulateDelay(2000);
      
      let prediction = "";
      if (timeFrame <= 3) {
        prediction = "Según el análisis del elemento y sus características, se recomienda programar un mantenimiento preventivo en los próximos 1-3 meses.";
      } else if (timeFrame <= 6) {
        prediction = "El análisis del elemento indica un estado aceptable con signos moderados de desgaste. Se recomienda programar mantenimiento preventivo en los próximos 4-6 meses.";
      } else {
        prediction = "El elemento presenta un excelente estado de conservación. Se puede programar su revisión dentro del mantenimiento regular a largo plazo.";
      }
      
      return {
        status: 'success',
        data: {
          prediction
        }
      };
    }
    
    try {
      const response: AxiosResponse<ApiResponse<{ prediction: string }>> = 
        await apiClient.post('/ai-assistant/predict-maintenance', {
          elementId,
          timeFrame
        });
      
      return response.data;
    } catch (error) {
      console.error('Error al generar predicción de mantenimiento:', error);
      throw error;
    }
  },

  // Consultar información de un elemento por GUID
  getElementInfoByGuid: async (guid: string): Promise<ApiResponse<{ elementInfo: any }>> => {
    console.log('Consultando información del elemento por GUID:', guid);
    
    if (DEMO_MODE) {
      await simulateDelay(1500);
      
      // Datos simulados para modo demo
      const demoElementInfo = {
        elementUuid: guid,
        elementName: `Elemento Demo ${guid.substring(0, 6)}`,
        elementType: 'IFCFURNISHINGELEMENT',
        category: 'Equipamiento',
        installationDate: '2023-05-15',
        nextMaintenanceDate: '2025-06-30',
        location: 'Planta 1, Zona Este',
        properties: {
          manufacturer: 'TechEquip Inc.',
          model: 'TE-2023',
          serialNumber: `SN-${guid.substring(0, 6)}`,
          dimensions: '120x80x200 cm'
        },
        history: [
          {
            date: '2024-02-15',
            action: 'inspection',
            description: 'Inspección rutinaria, funcionamiento correcto',
            technician: 'Juan Pérez'
          }
        ]
      };
      
      return {
        status: 'success',
        data: {
          elementInfo: demoElementInfo
        }
      };
    }
    
    try {
      const response: AxiosResponse<ApiResponse<{ data: any }>> = 
        await apiClient.get(`/predictive-agent/equipos/${guid}/info`);
      
      return {
        status: response.data.status,
        data: {
          elementInfo: response.data.data
        },
        message: response.data.message
      };
    } catch (error) {
      console.error('Error al consultar información del elemento:', error);
      throw error;
    }
  },

  // ====== NUEVOS MÉTODOS PARA IoT PREDICTIVO ======

  // Obtener estado del sistema IoT
  getIoTSystemStatus: async (): Promise<ApiResponse<{ systemStatus: SystemStatus }>> => {
    console.log('Obteniendo estado del sistema IoT');
    
    if (DEMO_MODE) {
      await simulateDelay(1000);
      
      const demoSystemStatus: SystemStatus = {
        timestamp: new Date().toISOString(),
        sensores: {
          total: 45,
          activos: 42,
          error: 2,
          errorInMemory: 1,
          inactive: 0,
          running: 42
        },
        lecturas: {
          recentCount: 1850,
          rate: '95.2%'
        },
        alertas: {
          lastHour: 3
        },
        system: {
          uptime: 99.5,
          isRunning: true,
          recoveryEnabled: true
        }
      };
      
      return {
        status: 'success',
        data: {
          systemStatus: demoSystemStatus
        }
      };
    }
    
    try {
      const response: AxiosResponse<ApiResponse<{ systemStatus: SystemStatus }>> = 
        await apiClient.get('/iot/system/status');
      
      return response.data;
    } catch (error) {
      console.error('Error al obtener estado del sistema IoT:', error);
      throw error;
    }
  },

  // Procesar consulta dinámica IoT
  processIoTQuery: async (query: string): Promise<ApiResponse<{ analisis: string; resultado?: string }>> => {
    console.log('Procesando consulta IoT:', query);
    
    if (DEMO_MODE) {
      await simulateDelay(2000);
      
      // Análisis básico de la consulta para generar una respuesta relevante
      const lowerQuery = query.toLowerCase();
      let analisis = "";
      
      if (lowerQuery.includes('temperatura')) {
        analisis = "**Análisis de Temperatura IoT**\n\nBasado en los datos de los sensores de temperatura:\n\n• **Temperatura promedio**: 22.3°C\n• **Rango detectado**: 19.5°C - 25.1°C\n• **Sensores activos**: 15 de 16\n• **Tendencia**: Estable con ligeras variaciones estacionales\n\n**Recomendaciones:**\n- Los valores están dentro del rango óptimo (20-24°C)\n- Sensor TMP-03 muestra lecturas erráticas, requiere calibración\n- Considerar ajuste de HVAC en zona norte durante horas pico";
      } else if (lowerQuery.includes('anomalía') || lowerQuery.includes('anomalia')) {
        analisis = "**Detección de Anomalías**\n\n🚨 **Anomalías detectadas en las últimas 24h:**\n\n• **Sensor HUM-07**: Lecturas fuera de rango (85% humedad)\n• **Sensor TMP-12**: Picos de temperatura anómalos\n• **Sensor AIR-03**: Calidad de aire degradada\n\n**Acciones recomendadas:**\n1. Revisar calibración de sensores identificados\n2. Verificar sistemas de ventilación en zona afectada\n3. Programar mantenimiento preventivo";
      } else if (lowerQuery.includes('eficiencia') || lowerQuery.includes('energía')) {
        analisis = "**Análisis de Eficiencia Energética**\n\n⚡ **Métricas de consumo energético:**\n\n• **Consumo actual**: 245 kWh/día\n• **Reducción vs. mes anterior**: -8.3%\n• **Eficiencia HVAC**: 87% (objetivo: 85%)\n• **Pico de consumo**: 14:00-16:00 hrs\n\n**Oportunidades de optimización:**\n- Implementar control predictivo de HVAC\n- Ajustar horarios de iluminación automática\n- ROI estimado: €2,400/año";
      } else {
        analisis = `**Análisis IoT Personalizado**\n\nHe procesado tu consulta: "${query}"\n\n**Datos del sistema:**\n• 42 sensores activos monitoreando el edificio\n• 1,850 lecturas procesadas en la última hora\n• Sistema operando al 95.2% de eficiencia\n\n**Insights relevantes:**\n- Condiciones ambientales dentro de parámetros normales\n- 3 alertas menores detectadas en la última hora\n- Tendencias estables en todos los sistemas monitoreados\n\nPara análisis más específicos, puedes consultar sobre temperatura, humedad, ocupación, calidad del aire, o eficiencia energética.`;
      }
      
      return {
        status: 'success',
        data: {
          analisis,
          resultado: analisis
        }
      };
    }
    
    try {
      const response: AxiosResponse<ApiResponse<{ analisis: string; resultado?: string }>> = 
        await apiClient.post('/iot-predictive/consulta-dinamica', {
          query
        });
      
      return response.data;
    } catch (error) {
      console.error('Error al procesar consulta IoT:', error);
      throw error;
    }
  },

  // Detectar anomalías
  detectAnomalies: async (period: string = 'dia'): Promise<ApiResponse<{ anomalias: Anomaly[]; deteccion: string }>> => {
    console.log('Detectando anomalías IoT para período:', period);
    
    if (DEMO_MODE) {
      await simulateDelay(2500);
      
      const demoAnomalies: Anomaly[] = [
        {
          sensorId: 'TMP-07',
          sensorName: 'Sensor Temperatura Sala Servidores',
          tipo: 'valor_atipico',
          valor: 28.5,
          valorEsperado: '22-24°C',
          desviacion: '+18.7%',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          severidad: 'alta',
          descripcion: 'Temperatura excesiva detectada en sala de servidores'
        },
        {
          sensorId: 'HUM-03',
          sensorName: 'Sensor Humedad Oficina Norte',
          tipo: 'tendencia_negativa',
          valor: 25,
          valorEsperado: '45-55%',
          desviacion: '-44.4%',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          severidad: 'media',
          descripcion: 'Humedad por debajo del rango recomendado'
        },
        {
          sensorId: 'AIR-05',
          sensorName: 'Sensor Calidad Aire Auditorio',
          tipo: 'calidad_degradada',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          severidad: 'baja',
          descripcion: 'Calidad de aire reducida durante evento'
        }
      ];
      
      const deteccion = `**Detección de Anomalías Completada**\n\n` +
        `🔍 **Período analizado**: ${period}\n` +
        `🚨 **Anomalías encontradas**: ${demoAnomalies.length}\n` +
        `⚠️ **Severidad alta**: ${demoAnomalies.filter(a => a.severidad === 'alta').length}\n` +
        `⚡ **Severidad media**: ${demoAnomalies.filter(a => a.severidad === 'media').length}\n\n` +
        `**Recomendaciones inmediatas:**\n` +
        `1. Revisar sistema de refrigeración en sala de servidores\n` +
        `2. Ajustar humidificación en oficina norte\n` +
        `3. Verificar ventilación en auditorio post-eventos`;
      
      return {
        status: 'success',
        data: {
          anomalias: demoAnomalies,
          deteccion
        }
      };
    }
    
    try {
      const response: AxiosResponse<ApiResponse<{ anomalias: Anomaly[]; deteccion: string }>> = 
        await apiClient.get(`/iot-predictive/detectar-anomalias?periodo=${period}`);
      
      return response.data;
    } catch (error) {
      console.error('Error al detectar anomalías:', error);
      throw error;
    }
  },

  // Generar análisis de eficiencia energética
  analyzeEnergyEfficiency: async (): Promise<ApiResponse<{ analisis: string; metricas: any }>> => {
    console.log('Analizando eficiencia energética');
    
    if (DEMO_MODE) {
      await simulateDelay(3000);
      
      const analisis = `**Análisis de Eficiencia Energética**\n\n` +
        `⚡ **Consumo actual**: 245 kWh/día (-8.3% vs mes anterior)\n` +
        `🎯 **Eficiencia HVAC**: 87% (objetivo alcanzado)\n` +
        `📊 **Distribución del consumo**:\n` +
        `• HVAC: 65% (159 kWh/día)\n` +
        `• Iluminación: 20% (49 kWh/día)\n` +
        `• Equipos: 15% (37 kWh/día)\n\n` +
        `**Oportunidades identificadas**:\n` +
        `1. **Control predictivo HVAC**: Ahorro estimado 12-15%\n` +
        `2. **Iluminación LED inteligente**: Ahorro 8-10%\n` +
        `3. **Gestión de cargas**: Ahorro 5-7%\n\n` +
        `💰 **ROI proyectado**: €2,400/año con inversión de €8,500`;
      
      const metricas = {
        consumoActual: 245,
        eficienciaHVAC: 87,
        ahorroProyectado: 2400,
        inversionRequerida: 8500,
        timeToROI: '3.5 años'
      };
      
      return {
        status: 'success',
        data: {
          analisis,
          metricas
        }
      };
    }
    
    try {
      const response: AxiosResponse<ApiResponse<{ analisis: string; metricas: any }>> = 
        await apiClient.get('/iot-predictive/eficiencia-energetica');
      
      return response.data;
    } catch (error) {
      console.error('Error al analizar eficiencia energética:', error);
      throw error;
    }
  },

  // ====== MÉTODOS PARA SISTEMA DE REPORTES ======

  // Generar reporte individual
  generateReport: async (config: ReportConfig): Promise<ApiResponse<{ reporte: ReportResult; previewUrl: string; downloadUrl: string }>> => {
    console.log('📊 Generando reporte con datos reales:', config);
    
    // ✅ NO usar DEMO_MODE aquí - siempre consultar la API real
    try {
      const response: AxiosResponse<ApiResponse<{ reporte: ReportResult; previewUrl: string; downloadUrl: string; dataAnalyzed: any }>> = 
        await apiClient.post('/iot-reports/generar', null, {
          params: {
            tipo: config.tipo,
            periodo: config.periodo
          }
        });
      
      console.log('✅ Reporte generado con datos reales:', {
        fileName: response.data.data?.reporte.fileName,
        dataAnalyzed: response.data.data?.dataAnalyzed
      });
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al generar reporte:', error);
      
      // Si hay error de red, mostrar mensaje específico
      if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
        throw new Error('No se puede conectar con el servidor. Verifique que el backend esté ejecutándose en http://localhost:4000');
      }
      
      throw error;
    }
  },

  // Generar suite completa CON DATOS REALES
  generateReportSuite: async (period: string): Promise<ApiResponse<{ reportes: any[]; totalGenerados: number; totalSolicitados: number }>> => {
    console.log('📊 Generando suite completa con datos reales para período:', period);
    
    try {
      const response: AxiosResponse<ApiResponse<{ reportes: any[]; totalGenerados: number; totalSolicitados: number }>> = 
        await apiClient.post('/iot-reports/generar-completo', null, {
          params: { periodo: period }
        });
      
      console.log('✅ Suite de reportes generada:', {
        totalGenerados: response.data.data?.totalGenerados,
        totalSolicitados: response.data.data?.totalSolicitados
      });
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al generar suite de reportes:', error);
      throw error;
    }
  },

  // Generar reporte personalizado CON DATOS REALES
  generateCustomReport: async (consulta: string, periodo: string): Promise<ApiResponse<{ reporte: ReportResult; previewUrl: string; downloadUrl: string; consultaOriginal: string }>> => {
    console.log('🎯 Generando reporte personalizado con datos reales:', consulta);
    
    try {
      const response: AxiosResponse<ApiResponse<{ reporte: ReportResult; previewUrl: string; downloadUrl: string; consultaOriginal: string }>> = 
        await apiClient.post('/iot-reports/generar-personalizado', {
          consulta,
          periodo,
          incluirGraficos: true
        });
      
      console.log('✅ Reporte personalizado generado:', response.data.data?.reporte.fileName);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al generar reporte personalizado:', error);
      throw error;
    }
  },

  // Listar reportes disponibles CON DATOS REALES
  listAvailableReports: async (): Promise<ApiResponse<{ reportes: ReportResult[] }>> => {
    console.log('📁 Listando reportes disponibles...');
    
    try {
      const response: AxiosResponse<ApiResponse<{ reportes: ReportResult[]; total: number }>> = 
        await apiClient.get('/iot-reports/listar');
      
      console.log('✅ Reportes listados:', {
        total: response.data.data?.total,
        disponibles: response.data.data?.reportes.length
      });
      
      return {
        status: response.data.status,
        data: {
          reportes: response.data.data?.reportes || []
        },
        message: response.data.message
      };
    } catch (error: any) {
      console.error('❌ Error al listar reportes:', error);
      throw error;
    }
  },

  // Eliminar reporte CON VALIDACIÓN REAL
  deleteReport: async (fileName: string): Promise<ApiResponse<{ message: string }>> => {
    console.log('🗑️ Eliminando reporte real:', fileName);
    
    try {
      const response: AxiosResponse<ApiResponse<{ message: string }>> = 
        await apiClient.delete(`/iot-reports/eliminar/${fileName}`);
      
      console.log('✅ Reporte eliminado:', fileName);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al eliminar reporte:', error);
      throw error;
    }
  },

  // Limpiar reportes antiguos CON DATOS REALES
  cleanOldReports: async (days: number = 30): Promise<ApiResponse<{ message: string; eliminados: number }>> => {
    console.log('🧹 Limpiando reportes antiguos:', days, 'días');
    
    try {
      const response: AxiosResponse<ApiResponse<{ message: string; eliminados: number }>> = 
        await apiClient.post(`/iot-reports/limpiar-antiguos`, null, {
          params: { dias: days }
        });
      
      console.log('✅ Reportes antiguos limpiados:', response.data.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al limpiar reportes antiguos:', error);
      throw error;
    }
  },

  // ====== NUEVOS MÉTODOS PARA VERIFICAR ESTADO DEL SISTEMA ======

  // Verificar conexión con backend
  checkBackendConnection: async (): Promise<boolean> => {
    try {
      const response = await apiClient.get('/iot-reports/test');
      console.log('✅ Backend conectado:', response.data);
      return response.data.status === 'success';
    } catch (error) {
      console.error('❌ Backend no disponible:', error);
      return false;
    }
  },

  // Obtener estadísticas del sistema en tiempo real
  getSystemStats: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/iot-reports/system-stats');
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del sistema:', error);
      throw error;
    }
  },

  // Verificar si hay datos disponibles para reportes
  checkDataAvailability: async (periodo: string = 'semana'): Promise<{ available: boolean; details: any }> => {
    try {
      const response = await apiClient.get(`/iot-reports/check-data?periodo=${periodo}`);
      return response.data.data;
    } catch (error) {
      console.error('❌ Error verificando disponibilidad de datos:', error);
      return { available: false, details: { error: error.message } };
    }
  }
};

export default aiAssistantService;