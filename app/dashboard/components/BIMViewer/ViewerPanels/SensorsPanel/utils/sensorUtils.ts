// src/components/ViewerPanels/SensorsPanel/utils/sensorUtils.ts
import { Sensor, SensorReading } from '../../../services/sensorApiService';
import { MockSensorData } from '../utils/mockSensorData';
// Tipos unificados
export type AnySensor = Sensor | MockSensorData;

// Constantes
export const SENSOR_TYPES = {
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  OCCUPANCY: 'occupancy',
  CO2: 'co2',
  LIGHT: 'light'
} as const;

export const SENSOR_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  MAINTENANCE: 'maintenance',
  CALIBRATING: 'calibrating'
} as const;

export const QUALITY_LEVELS = {
  GOOD: 'good',
  WARNING: 'warning',
  CRITICAL: 'critical',
  ERROR: 'error'
} as const;

// Interfaces para configuración
export interface SensorThresholds {
  warning?: { min?: number; max?: number };
  critical?: { min?: number; max?: number };
}

export interface SensorConfig {
  unit: string;
  samplingInterval?: number;
  thresholds?: SensorThresholds;
  calibration?: {
    offset?: number;
    multiplier?: number;
    lastCalibration?: string;
  };
}

// Validaciones
export const isSensorReal = (sensor: AnySensor): sensor is Sensor => {
  return !sensor.sensorId.includes('MOCK');
};

export const isSensorMock = (sensor: AnySensor): sensor is MockSensorData => {
  return sensor.sensorId.includes('MOCK');
};

export const isValidSensorType = (type: string): type is keyof typeof SENSOR_TYPES => {
  return Object.values(SENSOR_TYPES).includes(type as any);
};

export const isValidSensorStatus = (status: string): status is keyof typeof SENSOR_STATUS => {
  return Object.values(SENSOR_STATUS).includes(status as any);
};

// Funciones de estado
export const getSensorHealth = (sensor: AnySensor): 'healthy' | 'warning' | 'critical' | 'offline' => {
  // Verificar si tiene errores
  if (sensor.status === 'error' || (sensor as any).memoryStatus?.hasError) {
    return 'critical';
  }
  
  // Verificar si está inactivo
  if (sensor.status === 'inactive') {
    return 'offline';
  }
  
  // Verificar calidad de la última lectura
  if (sensor.lastReading) {
    switch (sensor.lastReading.quality) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'warning';
      case 'good':
      default:
        return 'healthy';
    }
  }
  
  return 'offline';
};

export const isSensorOnline = (sensor: AnySensor): boolean => {
  return sensor.status === 'active' && !((sensor as any).memoryStatus?.hasError);
};

export const isSensorOffline = (sensor: AnySensor): boolean => {
  return sensor.status === 'inactive' || sensor.status === 'error';
};

export const hasRecentReading = (sensor: AnySensor, maxAgeMinutes: number = 10): boolean => {
  if (!sensor.lastReading?.timestamp) return false;
  
  const readingTime = new Date(sensor.lastReading.timestamp);
  const now = new Date();
  const ageMinutes = (now.getTime() - readingTime.getTime()) / (1000 * 60);
  
  return ageMinutes <= maxAgeMinutes;
};

// Funciones de formateo
export const formatSensorValue = (
  value: number | undefined, 
  unit: string = '', 
  decimals: number = 1
): string => {
  if (value === undefined || value === null) return '--';
  
  return `${value.toFixed(decimals)} ${unit}`.trim();
};

export const formatTimestamp = (timestamp: string, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const date = new Date(timestamp);
  
  switch (format) {
    case 'long':
      return date.toLocaleString();
    case 'relative':
      return getRelativeTime(timestamp);
    case 'short':
    default:
      return date.toLocaleTimeString();
  }
};

export const getRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
};

// Funciones de análisis de datos
export const calculateSensorStatistics = (readings: SensorReading[]) => {
  if (readings.length === 0) {
    return {
      count: 0,
      average: 0,
      min: 0,
      max: 0,
      latest: null,
      trend: 'stable' as 'up' | 'down' | 'stable'
    };
  }
  
  const values = readings.map(r => r.value);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = readings[readings.length - 1];
  
  // Calcular tendencia (últimos 10 vs anteriores 10)
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (readings.length >= 10) {
    const recent = readings.slice(-10).map(r => r.value);
    const previous = readings.slice(-20, -10).map(r => r.value);
    
    if (recent.length > 0 && previous.length > 0) {
      const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const previousAvg = previous.reduce((sum, val) => sum + val, 0) / previous.length;
      const difference = recentAvg - previousAvg;
      
      if (Math.abs(difference) > average * 0.05) { // 5% de cambio
        trend = difference > 0 ? 'up' : 'down';
      }
    }
  }
  
  return {
    count: readings.length,
    average: Math.round(average * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    latest,
    trend
  };
};

export const detectAnomalies = (readings: SensorReading[], thresholds?: SensorThresholds) => {
  const anomalies: Array<{
    reading: SensorReading;
    type: 'threshold' | 'outlier' | 'gap';
    severity: 'warning' | 'critical';
    message: string;
  }> = [];
  
  if (readings.length === 0) return anomalies;
  
  // Detectar violaciones de umbrales
  if (thresholds) {
    readings.forEach(reading => {
      const { value } = reading;
      
      // Umbrales críticos
      if (thresholds.critical) {
        if ((thresholds.critical.min !== undefined && value < thresholds.critical.min) ||
            (thresholds.critical.max !== undefined && value > thresholds.critical.max)) {
          anomalies.push({
            reading,
            type: 'threshold',
            severity: 'critical',
            message: `Valor crítico: ${value}`
          });
        }
      }
      
      // Umbrales de advertencia
      if (thresholds.warning) {
        if ((thresholds.warning.min !== undefined && value < thresholds.warning.min) ||
            (thresholds.warning.max !== undefined && value > thresholds.warning.max)) {
          anomalies.push({
            reading,
            type: 'threshold',
            severity: 'warning',
            message: `Valor fuera de rango: ${value}`
          });
        }
      }
    });
  }
  
  // Detectar valores atípicos (outliers) usando Z-score
  if (readings.length >= 10) {
    const values = readings.map(r => r.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev > 0) {
      readings.forEach(reading => {
        const zScore = Math.abs((reading.value - mean) / stdDev);
        
        if (zScore > 3) { // Más de 3 desviaciones estándar
          anomalies.push({
            reading,
            type: 'outlier',
            severity: 'warning',
            message: `Valor atípico detectado: ${reading.value} (Z-score: ${zScore.toFixed(2)})`
          });
        }
      });
    }
  }
  
  // Detectar gaps en los datos
  for (let i = 1; i < readings.length; i++) {
    const currentTime = new Date(readings[i].timestamp);
    const previousTime = new Date(readings[i - 1].timestamp);
    const gapMinutes = (currentTime.getTime() - previousTime.getTime()) / (1000 * 60);
    
    if (gapMinutes > 30) { // Gap mayor a 30 minutos
      anomalies.push({
        reading: readings[i],
        type: 'gap',
        severity: 'warning',
        message: `Gap en datos: ${Math.round(gapMinutes)} minutos sin lecturas`
      });
    }
  }
  
  return anomalies;
};

// Funciones de agrupación y filtrado
export const groupSensorsByType = (sensors: AnySensor[]): Record<string, AnySensor[]> => {
  return sensors.reduce((groups, sensor) => {
    const type = sensor.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(sensor);
    return groups;
  }, {} as Record<string, AnySensor[]>);
};

export const groupSensorsByLocation = (sensors: AnySensor[]): Record<string, AnySensor[]> => {
  return sensors.reduce((groups, sensor) => {
    const location = sensor.location?.spaceName || 'Sin ubicación';
    if (!groups[location]) {
      groups[location] = [];
    }
    groups[location].push(sensor);
    return groups;
  }, {} as Record<string, AnySensor[]>);
};

export const groupSensorsByStatus = (sensors: AnySensor[]): Record<string, AnySensor[]> => {
  return sensors.reduce((groups, sensor) => {
    const status = sensor.status;
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(sensor);
    return groups;
  }, {} as Record<string, AnySensor[]>);
};

export const filterSensorsByHealth = (sensors: AnySensor[], health: ReturnType<typeof getSensorHealth>): AnySensor[] => {
  return sensors.filter(sensor => getSensorHealth(sensor) === health);
};

export const filterSensorsByType = (sensors: AnySensor[], types: string[]): AnySensor[] => {
  return sensors.filter(sensor => types.includes(sensor.type));
};

export const filterSensorsWithRecentData = (sensors: AnySensor[], maxAgeMinutes: number = 10): AnySensor[] => {
  return sensors.filter(sensor => hasRecentReading(sensor, maxAgeMinutes));
};

// Funciones de ordenamiento
export const sortSensorsByName = (sensors: AnySensor[], ascending: boolean = true): AnySensor[] => {
  return [...sensors].sort((a, b) => {
    const comparison = a.name.localeCompare(b.name);
    return ascending ? comparison : -comparison;
  });
};

export const sortSensorsByLastReading = (sensors: AnySensor[], ascending: boolean = false): AnySensor[] => {
  return [...sensors].sort((a, b) => {
    const aTime = a.lastReading?.timestamp ? new Date(a.lastReading.timestamp).getTime() : 0;
    const bTime = b.lastReading?.timestamp ? new Date(b.lastReading.timestamp).getTime() : 0;
    const comparison = aTime - bTime;
    return ascending ? comparison : -comparison;
  });
};

export const sortSensorsByStatus = (sensors: AnySensor[]): AnySensor[] => {
  const statusPriority = {
    'error': 0,
    'active': 1,
    'maintenance': 2,
    'calibrating': 3,
    'inactive': 4
  };
  
  return [...sensors].sort((a, b) => {
    const aPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 5;
    const bPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 5;
    return aPriority - bPriority;
  });
};

// Funciones de exportación
export const exportSensorsToCSV = (sensors: AnySensor[]): string => {
  const headers = [
    'ID',
    'Nombre',
    'Tipo',
    'Estado',
    'Ubicación',
    'Último Valor',
    'Unidad',
    'Calidad',
    'Timestamp',
    'Es Real'
  ];
  
  const rows = sensors.map(sensor => [
    sensor.sensorId,
    sensor.name,
    sensor.type,
    sensor.status,
    sensor.location?.spaceName || '',
    sensor.lastReading?.value?.toString() || '',
    (sensor as any).config?.unit || '',
    sensor.lastReading?.quality || '',
    sensor.lastReading?.timestamp || '',
    isSensorReal(sensor) ? 'Sí' : 'No'
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
};

export const exportSensorReadingsToCSV = (readings: SensorReading[]): string => {
  const headers = ['Timestamp', 'Valor', 'Unidad', 'Calidad', 'Sensor ID'];
  
  const rows = readings.map(reading => [
    reading.timestamp,
    reading.value.toString(),
    reading.unit,
    reading.quality,
    reading.sensorId
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
};

// Función de búsqueda
export const searchSensors = (sensors: AnySensor[], query: string): AnySensor[] => {
  if (!query.trim()) return sensors;
  
  const lowerQuery = query.toLowerCase();
  
  return sensors.filter(sensor => 
    sensor.name.toLowerCase().includes(lowerQuery) ||
    sensor.sensorId.toLowerCase().includes(lowerQuery) ||
    sensor.type.toLowerCase().includes(lowerQuery) ||
    sensor.location?.spaceName?.toLowerCase().includes(lowerQuery) ||
    sensor.status.toLowerCase().includes(lowerQuery)
  );
};

// Función para generar reporte
export const generateSensorReport = (sensors: AnySensor[]) => {
  const totalSensors = sensors.length;
  const sensorsByType = groupSensorsByType(sensors);
  const sensorsByStatus = groupSensorsByStatus(sensors);
  const sensorsByLocation = groupSensorsByLocation(sensors);
  
  const healthSummary = {
    healthy: filterSensorsByHealth(sensors, 'healthy').length,
    warning: filterSensorsByHealth(sensors, 'warning').length,
    critical: filterSensorsByHealth(sensors, 'critical').length,
    offline: filterSensorsByHealth(sensors, 'offline').length
  };
  
  const recentData = filterSensorsWithRecentData(sensors, 10);
  const realSensors = sensors.filter(isSensorReal);
  const mockSensors = sensors.filter(isSensorMock);
  
  return {
    summary: {
      total: totalSensors,
      real: realSensors.length,
      mock: mockSensors.length,
      withRecentData: recentData.length,
      dataFreshness: totalSensors > 0 ? (recentData.length / totalSensors) * 100 : 0
    },
    health: healthSummary,
    distribution: {
      byType: Object.entries(sensorsByType).map(([type, sensors]) => ({
        type,
        count: sensors.length,
        percentage: totalSensors > 0 ? (sensors.length / totalSensors) * 100 : 0
      })),
      byStatus: Object.entries(sensorsByStatus).map(([status, sensors]) => ({
        status,
        count: sensors.length,
        percentage: totalSensors > 0 ? (sensors.length / totalSensors) * 100 : 0
      })),
      byLocation: Object.entries(sensorsByLocation).map(([location, sensors]) => ({
        location,
        count: sensors.length,
        percentage: totalSensors > 0 ? (sensors.length / totalSensors) * 100 : 0
      }))
    },
    performance: calculateSystemPerformance(sensors),
    predictions: predictPotentialIssues(sensors),
    redundancies: detectRedundantSensors(sensors),
    alerts: generateSmartAlerts(sensors),
    recommendations: generateRecommendations(sensors),
    statistics: {
      averageHealthScore: totalSensors > 0 ? 
        sensors.reduce((sum, sensor) => sum + calculateSensorHealthScore(sensor), 0) / totalSensors : 0,
      oldestReading: sensors
        .filter(s => s.lastReading?.timestamp)
        .sort((a, b) => new Date(a.lastReading!.timestamp).getTime() - new Date(b.lastReading!.timestamp).getTime())[0]?.lastReading?.timestamp || null,
      newestReading: sensors
        .filter(s => s.lastReading?.timestamp)
        .sort((a, b) => new Date(b.lastReading!.timestamp).getTime() - new Date(a.lastReading!.timestamp).getTime())[0]?.lastReading?.timestamp || null,
      typeCoverage: (Object.keys(sensorsByType).length / Object.keys(SENSOR_TYPES).length) * 100,
      locationCoverage: Object.keys(sensorsByLocation).length,
      realVsMockRatio: realSensors.length > 0 ? mockSensors.length / realSensors.length : mockSensors.length > 0 ? Infinity : 0
    },
    insights: {
      mostCommonType: Object.entries(sensorsByType).sort((a, b) => b[1].length - a[1].length)[0]?.[0] || null,
      mostPopulatedLocation: Object.entries(sensorsByLocation).sort((a, b) => b[1].length - a[1].length)[0]?.[0] || null,
      criticalSensors: sensors.filter(s => getSensorHealth(s) === 'critical').length,
      sensorsNeedingAttention: sensors.filter(s => 
        s.status === 'error' || 
        s.lastReading?.quality === 'critical' || 
        !hasRecentReading(s, 60)
      ).length,
      dataGaps: sensors.filter(s => !hasRecentReading(s, 30)).length,
      systemStability: Math.max(0, 100 - (sensors.filter(s => s.status === 'error').length / totalSensors) * 100)
    },
    metadata: {
      reportId: `report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      dataPoints: sensors.reduce((sum, sensor) => 
        sum + ((sensor as Sensor).statistics?.totalReadings || (sensor.lastReading ? 1 : 0)), 0
      ),
      coveragePeriod: {
        from: sensors
          .filter(s => s.lastReading?.timestamp)
          .sort((a, b) => new Date(a.lastReading!.timestamp).getTime() - new Date(b.lastReading!.timestamp).getTime())[0]?.lastReading?.timestamp || null,
        to: sensors
          .filter(s => s.lastReading?.timestamp)
          .sort((a, b) => new Date(b.lastReading!.timestamp).getTime() - new Date(a.lastReading!.timestamp).getTime())[0]?.lastReading?.timestamp || null
      }
    }
  };
};

// Función para generar recomendaciones
const generateRecommendations = (sensors: AnySensor[]): string[] => {
  const recommendations: string[] = [];
  
  // Sensores con errores
  const errorSensors = sensors.filter(s => s.status === 'error' || (s as any).memoryStatus?.hasError);
  if (errorSensors.length > 0) {
    recommendations.push(`⚠️ ${errorSensors.length} sensor(es) con error requieren atención inmediata`);
  }
  
  // Sensores sin datos recientes
  const staleDataSensors = sensors.filter(s => !hasRecentReading(s, 30));
  if (staleDataSensors.length > 0) {
    recommendations.push(`📡 ${staleDataSensors.length} sensor(es) sin datos recientes (>30min)`);
  }
  
  // Distribución desigual por ubicación
  const locationGroups = groupSensorsByLocation(sensors);
  const locationsWithFewSensors = Object.entries(locationGroups).filter(([, sensors]) => sensors.length === 1);
  if (locationsWithFewSensors.length > 0) {
    recommendations.push(`📍 ${locationsWithFewSensors.length} ubicación(es) con un solo sensor - considerar redundancia`);
  }
  
  // Muchos sensores ficticios
  const mockSensors = sensors.filter(isSensorMock);
  const mockPercentage = mockSensors.length > 0 ? (mockSensors.length / sensors.length) * 100 : 0;
  if (mockPercentage > 50) {
    recommendations.push(`🎭 ${mockPercentage.toFixed(1)}% de sensores son ficticios - considerar implementar sensores reales`);
  }
  
  // Sensores inactivos
  const inactiveSensors = sensors.filter(s => s.status === 'inactive');
  if (inactiveSensors.length > 0) {
    recommendations.push(`⏸️ ${inactiveSensors.length} sensor(es) inactivo(s) - verificar conectividad`);
  }
  
  // Verificar cobertura por tipo
  const typeGroups = groupSensorsByType(sensors);
  const missingTypes = Object.values(SENSOR_TYPES).filter(type => !typeGroups[type] || typeGroups[type].length === 0);
  if (missingTypes.length > 0) {
    recommendations.push(`🔍 Faltan sensores de tipo: ${missingTypes.join(', ')}`);
  }
  
  // Verificar densidad de sensores por ubicación
  const locationCoverage = Object.entries(locationGroups);
  if (locationCoverage.length < 3 && sensors.length > 5) {
    recommendations.push(`🏢 Pocos espacios monitoreados - considerar expandir cobertura`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ El sistema de sensores está funcionando correctamente');
  }
  
  return recommendations;
};

// Función para validar configuración de sensor
export const validateSensorConfig = (config: Partial<SensorConfig>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validar unidad
  if (!config.unit || config.unit.trim() === '') {
    errors.push('La unidad es requerida');
  }
  
  // Validar intervalo de muestreo
  if (config.samplingInterval !== undefined) {
    if (config.samplingInterval < 1000) {
      errors.push('El intervalo de muestreo debe ser al menos 1 segundo (1000ms)');
    }
    if (config.samplingInterval > 3600000) {
      errors.push('El intervalo de muestreo no debe exceder 1 hora (3600000ms)');
    }
  }
  
  // Validar umbrales
  if (config.thresholds) {
    const { warning, critical } = config.thresholds;
    
    if (warning) {
      if (warning.min !== undefined && warning.max !== undefined && warning.min >= warning.max) {
        errors.push('El umbral mínimo de advertencia debe ser menor que el máximo');
      }
    }
    
    if (critical) {
      if (critical.min !== undefined && critical.max !== undefined && critical.min >= critical.max) {
        errors.push('El umbral mínimo crítico debe ser menor que el máximo');
      }
    }
    
    if (warning && critical) {
      if (warning.min !== undefined && critical.min !== undefined && warning.min <= critical.min) {
        errors.push('El umbral de advertencia debe estar dentro del rango crítico');
      }
      if (warning.max !== undefined && critical.max !== undefined && warning.max >= critical.max) {
        errors.push('El umbral de advertencia debe estar dentro del rango crítico');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Función para crear configuraciones por defecto según el tipo
export const getDefaultSensorConfig = (type: string): SensorConfig => {
  const configs: Record<string, SensorConfig> = {
    temperature: {
      unit: '°C',
      samplingInterval: 30000,
      thresholds: {
        warning: { min: 18, max: 28 },
        critical: { min: 15, max: 35 }
      }
    },
    humidity: {
      unit: '%',
      samplingInterval: 30000,
      thresholds: {
        warning: { min: 30, max: 70 },
        critical: { min: 20, max: 80 }
      }
    },
    occupancy: {
      unit: 'personas',
      samplingInterval: 15000,
      thresholds: {
        warning: { max: 15 },
        critical: { max: 20 }
      }
    },
    co2: {
      unit: 'ppm',
      samplingInterval: 60000,
      thresholds: {
        warning: { max: 800 },
        critical: { max: 1000 }
      }
    },
    light: {
      unit: 'lux',
      samplingInterval: 60000,
      thresholds: {
        warning: { min: 100, max: 800 },
        critical: { min: 50, max: 1000 }
      }
    }
  };
  
  return configs[type] || {
    unit: '',
    samplingInterval: 30000,
    thresholds: {}
  };
};

// Función para calcular score de salud del sensor
export const calculateSensorHealthScore = (sensor: AnySensor): number => {
  let score = 100; // Comenzar con puntuación perfecta
  
  // Penalizar por estado
  switch (sensor.status) {
    case 'error':
      score -= 50;
      break;
    case 'inactive':
      score -= 30;
      break;
    case 'maintenance':
      score -= 20;
      break;
    case 'calibrating':
      score -= 10;
      break;
  }
  
  // Penalizar por errores de memoria
  if ((sensor as any).memoryStatus?.hasError) {
    score -= 25;
  }
  
  // Penalizar por calidad de datos
  if (sensor.lastReading) {
    switch (sensor.lastReading.quality) {
      case 'critical':
        score -= 25;
        break;
      case 'warning':
        score -= 15;
        break;
      case 'error':
        score -= 30;
        break;
    }
  } else {
    score -= 20; // Sin lecturas
  }
  
  // Penalizar por datos antiguos
  if (!hasRecentReading(sensor, 10)) {
    score -= 15;
  }
  
  // Bonus por ser sensor real
  if (isSensorReal(sensor)) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, score));
};

// Función para formatear valores según el tipo de sensor
export const formatValueByType = (value: number, type: string): string => {
  const configs = {
    temperature: { decimals: 1, suffix: '°C' },
    humidity: { decimals: 1, suffix: '%' },
    occupancy: { decimals: 0, suffix: ' personas' },
    co2: { decimals: 0, suffix: ' ppm' },
    light: { decimals: 0, suffix: ' lux' }
  };
  
  const config = configs[type as keyof typeof configs] || { decimals: 1, suffix: '' };
  return `${value.toFixed(config.decimals)}${config.suffix}`;
};

// Funciones de conversión de unidades
export const convertTemperature = (value: number, from: 'C' | 'F' | 'K', to: 'C' | 'F' | 'K'): number => {
  if (from === to) return value;
  
  // Convertir a Celsius primero
  let celsius = value;
  if (from === 'F') {
    celsius = (value - 32) * 5/9;
  } else if (from === 'K') {
    celsius = value - 273.15;
  }
  
  // Convertir de Celsius a la unidad deseada
  switch (to) {
    case 'F':
      return celsius * 9/5 + 32;
    case 'K':
      return celsius + 273.15;
    default:
      return celsius;
  }
};

// Función para generar colores consistentes para sensores
export const getSensorColor = (sensorId: string): string => {
  const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6366F1'
  ];
  
  // Generar hash simple del ID para consistencia
  let hash = 0;
  for (let i = 0; i < sensorId.length; i++) {
    const char = sensorId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Función para calcular proximidad entre sensores del mismo tipo
export const calculateSensorProximity = (sensor1: AnySensor, sensor2: AnySensor): 'same-location' | 'nearby' | 'distant' => {
  if (sensor1.type !== sensor2.type) return 'distant';
  
  const loc1 = sensor1.location?.spaceName || '';
  const loc2 = sensor2.location?.spaceName || '';
  
  if (loc1 === loc2) return 'same-location';
  
  // Verificar si están en el mismo piso o zona
  const zone1 = sensor1.location?.zone || '';
  const zone2 = sensor2.location?.zone || '';
  const floor1 = (sensor1.location as any)?.floor || '';
  const floor2 = (sensor2.location as any)?.floor || '';
  
  if (zone1 === zone2 || floor1 === floor2) return 'nearby';
  
  return 'distant';
};

// Función para detectar sensores redundantes
export const detectRedundantSensors = (sensors: AnySensor[]): Array<{
  sensors: AnySensor[];
  reason: string;
  recommendation: string;
}> => {
  const redundancies: Array<{
    sensors: AnySensor[];
    reason: string;
    recommendation: string;
  }> = [];
  
  // Agrupar por tipo y ubicación
  const groups = sensors.reduce((acc, sensor) => {
    const key = `${sensor.type}-${sensor.location?.spaceName || 'unknown'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(sensor);
    return acc;
  }, {} as Record<string, AnySensor[]>);
  
  // Detectar grupos con múltiples sensores
  Object.entries(groups).forEach(([key, groupSensors]) => {
    if (groupSensors.length > 1) {
      const [type, location] = key.split('-');
      redundancies.push({
        sensors: groupSensors,
        reason: `Múltiples sensores de ${type} en ${location}`,
        recommendation: 'Verificar si es necesaria la redundancia o consolidar sensores'
      });
    }
  });
  
// Función para generar métricas de rendimiento del sistema
export const calculateSystemPerformance = (sensors: AnySensor[]) => {
  const totalSensors = sensors.length;
  if (totalSensors === 0) {
    return {
      overall: 0,
      availability: 0,
      dataQuality: 0,
      responseTime: 0,
      reliability: 0,
      coverage: 0
    };
  }
  
  // Disponibilidad (sensores activos vs total)
  const activeSensors = sensors.filter(s => s.status === 'active').length;
  const availability = (activeSensors / totalSensors) * 100;
  
  // Calidad de datos (sensores con buena calidad vs total con datos)
  const sensorsWithData = sensors.filter(s => s.lastReading);
  const goodQualityCount = sensorsWithData.filter(s => s.lastReading?.quality === 'good').length;
  const dataQuality = sensorsWithData.length > 0 ? (goodQualityCount / sensorsWithData.length) * 100 : 0;
  
  // Tiempo de respuesta (basado en datos recientes)
  const recentDataCount = sensors.filter(s => hasRecentReading(s, 5)).length;
  const responseTime = sensorsWithData.length > 0 ? (recentDataCount / sensorsWithData.length) * 100 : 0;
  
  // Confiabilidad (sensores sin errores vs total)
  const sensorsWithoutErrors = sensors.filter(s => 
    s.status !== 'error' && !(s as any).memoryStatus?.hasError
  ).length;
  const reliability = (sensorsWithoutErrors / totalSensors) * 100;
  
  // Cobertura (tipos de sensores vs tipos esperados)
  const uniqueTypes = new Set(sensors.map(s => s.type)).size;
  const expectedTypes = Object.keys(SENSOR_TYPES).length;
  const coverage = (uniqueTypes / expectedTypes) * 100;
  
  // Puntuación general (promedio ponderado)
  const overall = (
    availability * 0.3 +
    dataQuality * 0.25 +
    responseTime * 0.2 +
    reliability * 0.15 +
    coverage * 0.1
  );
  
  return {
    overall: Math.round(overall),
    availability: Math.round(availability),
    dataQuality: Math.round(dataQuality),
    responseTime: Math.round(responseTime),
    reliability: Math.round(reliability),
    coverage: Math.round(coverage)
  };
};

// Función para predecir problemas potenciales
export const predictPotentialIssues = (sensors: AnySensor[]): Array<{
  type: 'warning' | 'critical';
  sensor?: AnySensor;
  issue: string;
  prediction: string;
  confidence: number;
}> => {
  const predictions: Array<{
    type: 'warning' | 'critical';
    sensor?: AnySensor;
    issue: string;
    prediction: string;
    confidence: number;
  }> = [];
  
  sensors.forEach(sensor => {
    // Predecir fallos basados en calidad decreciente
    if (sensor.lastReading?.quality === 'warning') {
      predictions.push({
        type: 'warning',
        sensor,
        issue: 'Calidad de datos decreciente',
        prediction: 'Posible fallo del sensor en las próximas 24-48 horas',
        confidence: 65
      });
    }
    
    // Predecir problemas de conectividad
    if (!hasRecentReading(sensor, 30) && sensor.status === 'active') {
      predictions.push({
        type: 'critical',
        sensor,
        issue: 'Pérdida de comunicación',
        prediction: 'Sensor probablemente desconectado o con problemas de red',
        confidence: 85
      });
    }
    
    // Predecir mantenimiento necesario (sensores reales)
    if (isSensorReal(sensor) && (sensor as Sensor).statistics?.totalReadings) {
      const readings = (sensor as Sensor).statistics!.totalReadings;
      if (readings > 10000) {
        predictions.push({
          type: 'warning',
          sensor,
          issue: 'Mantenimiento preventivo',
          prediction: 'Sensor con alto número de lecturas, considerar calibración',
          confidence: 50
        });
      }
    }
  });
  
  // Predicciones a nivel de sistema
  const errorRate = (sensors.filter(s => s.status === 'error').length / sensors.length) * 100;
  if (errorRate > 20) {
    predictions.push({
      type: 'critical',
      issue: 'Alta tasa de errores del sistema',
      prediction: 'Posible problema infraestructural o de configuración',
      confidence: 80
    });
  }
  
  return predictions.sort((a, b) => b.confidence - a.confidence);
};

// Función para generar alertas inteligentes
export const generateSmartAlerts = (sensors: AnySensor[], historical?: SensorReading[]): Array<{
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  sensor?: AnySensor;
  timestamp: string;
  actionRequired: boolean;
  suggestedActions?: string[];
}> => {
  const alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    sensor?: AnySensor;
    timestamp: string;
    actionRequired: boolean;
    suggestedActions?: string[];
  }> = [];
  
  const timestamp = new Date().toISOString();
  
  // Alertas por sensor individual
  sensors.forEach(sensor => {
    const alertId = `alert_${sensor.sensorId}_${Date.now()}`;
    
    // Sensor con error crítico
    if (sensor.status === 'error') {
      alerts.push({
        id: alertId,
        type: 'critical',
        title: 'Sensor con Error Crítico',
        message: `${sensor.name} está reportando errores y requiere atención inmediata`,
        sensor,
        timestamp,
        actionRequired: true,
        suggestedActions: [
          'Verificar conexión física del sensor',
          'Reiniciar sensor',
          'Verificar configuración',
          'Contactar soporte técnico'
        ]
      });
    }
    
    // Datos de calidad crítica
    if (sensor.lastReading?.quality === 'critical') {
      alerts.push({
        id: `${alertId}_quality`,
        type: 'error',
        title: 'Calidad de Datos Crítica',
        message: `${sensor.name} está reportando datos de calidad crítica: ${sensor.lastReading.value} ${(sensor as any).config?.unit}`,
        sensor,
        timestamp,
        actionRequired: true,
        suggestedActions: [
          'Verificar condiciones ambientales',
          'Calibrar sensor',
          'Verificar umbrales configurados'
        ]
      });
    }
    
    // Sensor sin datos recientes
    if (!hasRecentReading(sensor, 60) && sensor.status === 'active') {
      alerts.push({
        id: `${alertId}_stale`,
        type: 'warning',
        title: 'Sensor Sin Datos Recientes',
        message: `${sensor.name} no ha enviado datos en más de 1 hora`,
        sensor,
        timestamp,
        actionRequired: true,
        suggestedActions: [
          'Verificar conectividad de red',
          'Reiniciar sensor',
          'Verificar alimentación'
        ]
      });
    }
  });
  
  // Alertas a nivel de sistema
  const systemPerformance = calculateSystemPerformance(sensors);
  
  if (systemPerformance.overall < 70) {
    alerts.push({
      id: `system_performance_${Date.now()}`,
      type: 'warning',
      title: 'Rendimiento del Sistema Bajo',
      message: `El rendimiento general del sistema es del ${systemPerformance.overall}%`,
      timestamp,
      actionRequired: true,
      suggestedActions: [
        'Revisar sensores con errores',
        'Verificar conectividad general',
        'Actualizar configuraciones'
      ]
    });
  }
  
  if (systemPerformance.availability < 80) {
    alerts.push({
      id: `system_availability_${Date.now()}`,
      type: 'error',
      title: 'Baja Disponibilidad del Sistema',
      message: `Solo el ${systemPerformance.availability}% de los sensores están activos`,
      timestamp,
      actionRequired: true,
      suggestedActions: [
        'Activar sensores inactivos',
        'Verificar problemas de red',
        'Revisar configuración del sistema'
      ]
    });
  }
  
  return alerts.sort((a, b) => {
    const priorityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
    return priorityOrder[a.type] - priorityOrder[b.type];
  });
};

// Función para debugging avanzado
export const debugSensorState = (sensor: AnySensor): void => {
  console.group(`🔍 Debug Sensor: ${sensor.name} (${sensor.sensorId})`);
  console.log('📋 Información General:');
  console.table({
    'ID': sensor.sensorId,
    'Nombre': sensor.name,
    'Tipo': sensor.type,
    'Estado': sensor.status,
    'Es Real': isSensorReal(sensor) ? 'Sí' : 'No',
    'Ubicación': sensor.location?.spaceName || 'Sin ubicación'
  });
  
  console.log('🏥 Estado de Salud:');
  console.table({
    'Salud General': getSensorHealth(sensor),
    'Puntuación': `${calculateSensorHealthScore(sensor)}/100`,
    'En Línea': isSensorOnline(sensor) ? 'Sí' : 'No',
    'Datos Recientes': hasRecentReading(sensor) ? 'Sí' : 'No'
  });
  
  if (sensor.lastReading) {
    console.log('📊 Última Lectura:');
    console.table({
      'Valor': formatValueByType(sensor.lastReading.value, sensor.type),
      'Calidad': sensor.lastReading.quality,
      'Timestamp': formatTimestamp(sensor.lastReading.timestamp, 'long'),
      'Antigüedad': getRelativeTime(sensor.lastReading.timestamp)
    });
  }
  
  if ((sensor as any).config) {
    console.log('⚙️ Configuración:');
    console.log((sensor as any).config);
  }
  
  if ((sensor as any).memoryStatus) {
    console.log('💾 Estado de Memoria:');
    console.log((sensor as any).memoryStatus);
  }
  
  if (isSensorReal(sensor) && (sensor as Sensor).statistics) {
    console.log('📈 Estadísticas:');
    console.log((sensor as Sensor).statistics);
  }
  
  console.groupEnd();
};

// Función para benchmark de rendimiento
export const benchmarkSensorSystem = (sensors: AnySensor[]) => {
  const startTime = performance.now();
  
  // Ejecutar varias operaciones de benchmark
  const benchmarks = {
    grouping: () => {
      const start = performance.now();
      groupSensorsByType(sensors);
      groupSensorsByLocation(sensors);
      groupSensorsByStatus(sensors);
      return performance.now() - start;
    },
    
    filtering: () => {
      const start = performance.now();
      filterSensorsByHealth(sensors, 'healthy');
      filterSensorsByType(sensors, ['temperature', 'humidity']);
      filterSensorsWithRecentData(sensors);
      return performance.now() - start;
    },
    
    sorting: () => {
      const start = performance.now();
      sortSensorsByName(sensors);
      sortSensorsByLastReading(sensors);
      sortSensorsByStatus(sensors);
      return performance.now() - start;
    },
    
    analysis: () => {
      const start = performance.now();
      sensors.forEach(sensor => {
        getSensorHealth(sensor);
        calculateSensorHealthScore(sensor);
        hasRecentReading(sensor);
      });
      return performance.now() - start;
    },
    
    reporting: () => {
      const start = performance.now();
      generateSensorReport(sensors);
      calculateSystemPerformance(sensors);
      return performance.now() - start;
    }
  };
  
  const results = Object.entries(benchmarks).reduce((acc, [name, fn]) => {
    acc[name] = fn();
    return acc;
  }, {} as Record<string, number>);
  
  const totalTime = performance.now() - startTime;
  
  return {
    totalTime: Math.round(totalTime * 100) / 100,
    operations: Object.entries(results).map(([name, time]) => ({
      operation: name,
      time: Math.round(time * 100) / 100,
      percentage: Math.round((time / totalTime) * 100)
    })),
    sensorsProcessed: sensors.length,
    performance: sensors.length > 0 ? Math.round(sensors.length / totalTime * 1000) : 0 // sensores por segundo
  };
};

// Exportación por defecto con todas las funciones principales
export default {
  // Tipos y constantes
  SENSOR_TYPES,
  SENSOR_STATUS,
  QUALITY_LEVELS,
  
  // Validaciones
  isSensorReal,
  isSensorMock,
  isValidSensorType,
  isValidSensorStatus,
  
  // Estado y salud
  getSensorHealth,
  isSensorOnline,
  isSensorOffline,
  hasRecentReading,
  calculateSensorHealthScore,
  
  // Formateo
  formatSensorValue,
  formatTimestamp,
  formatValueByType,
  getRelativeTime,
  
  // Análisis
  calculateSensorStatistics,
  detectAnomalies,
  calculateSystemPerformance,
  predictPotentialIssues,
  
  // Agrupación y filtrado
  groupSensorsByType,
  groupSensorsByLocation,
  groupSensorsByStatus,
  filterSensorsByHealth,
  filterSensorsByType,
  filterSensorsWithRecentData,
  
  // Ordenamiento
  sortSensorsByName,
  sortSensorsByLastReading,
  sortSensorsByStatus,
  
  // Exportación
  exportSensorsToCSV,
  exportSensorReadingsToCSV,
  
  // Búsqueda y reporte
  searchSensors,
  generateSensorReport,
  generateSmartAlerts,
  
  // Configuración
  validateSensorConfig,
  getDefaultSensorConfig,
  
  // Utilidades avanzadas
  convertTemperature,
  getSensorColor,
  calculateSensorProximity,
  detectRedundantSensors,
  
  // Debugging y benchmarking
  debugSensorState,
  benchmarkSensorSystem
};// src/components/ViewerPanels/SensorsPanel/utils/sensorUtils.ts
import { Sensor, SensorReading } from '../../../services/sensorApiService';
import { MockSensorData } from '../mockSensorData';

// Tipos unificados
export type AnySensor = Sensor | MockSensorData;

// Constantes
export const SENSOR_TYPES = {
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  OCCUPANCY: 'occupancy',
  CO2: 'co2',
  LIGHT: 'light'
} as const;

export const SENSOR_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  MAINTENANCE: 'maintenance',
  CALIBRATING: 'calibrating'
} as const;

export const QUALITY_LEVELS = {
  GOOD: 'good',
  WARNING: 'warning',
  CRITICAL: 'critical',
  ERROR: 'error'
} as const;

// Interfaces para configuración
export interface SensorThresholds {
  warning?: { min?: number; max?: number };
  critical?: { min?: number; max?: number };
}

export interface SensorConfig {
  unit: string;
  samplingInterval?: number;
  thresholds?: SensorThresholds;
  calibration?: {
    offset?: number;
    multiplier?: number;
    lastCalibration?: string;
  };
}

// Validaciones
export const isSensorReal = (sensor: AnySensor): sensor is Sensor => {
  return !sensor.sensorId.includes('MOCK');
};

export const isSensorMock = (sensor: AnySensor): sensor is MockSensorData => {
  return sensor.sensorId.includes('MOCK');
};

export const isValidSensorType = (type: string): type is keyof typeof SENSOR_TYPES => {
  return Object.values(SENSOR_TYPES).includes(type as any);
};

export const isValidSensorStatus = (status: string): status is keyof typeof SENSOR_STATUS => {
  return Object.values(SENSOR_STATUS).includes(status as any);
};

// Funciones de estado
export const getSensorHealth = (sensor: AnySensor): 'healthy' | 'warning' | 'critical' | 'offline' => {
  // Verificar si tiene errores
  if (sensor.status === 'error' || (sensor as any).memoryStatus?.hasError) {
    return 'critical';
  }
  
  // Verificar si está inactivo
  if (sensor.status === 'inactive') {
    return 'offline';
  }
  
  // Verificar calidad de la última lectura
  if (sensor.lastReading) {
    switch (sensor.lastReading.quality) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'warning';
      case 'good':
      default:
        return 'healthy';
    }
  }
  
  return 'offline';
};

export const isSensorOnline = (sensor: AnySensor): boolean => {
  return sensor.status === 'active' && !((sensor as any).memoryStatus?.hasError);
};

export const isSensorOffline = (sensor: AnySensor): boolean => {
  return sensor.status === 'inactive' || sensor.status === 'error';
};

export const hasRecentReading = (sensor: AnySensor, maxAgeMinutes: number = 10): boolean => {
  if (!sensor.lastReading?.timestamp) return false;
  
  const readingTime = new Date(sensor.lastReading.timestamp);
  const now = new Date();
  const ageMinutes = (now.getTime() - readingTime.getTime()) / (1000 * 60);
  
  return ageMinutes <= maxAgeMinutes;
};

// Funciones de formateo
export const formatSensorValue = (
  value: number | undefined, 
  unit: string = '', 
  decimals: number = 1
): string => {
  if (value === undefined || value === null) return '--';
  
  return `${value.toFixed(decimals)} ${unit}`.trim();
};

export const formatTimestamp = (timestamp: string, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const date = new Date(timestamp);
  
  switch (format) {
    case 'long':
      return date.toLocaleString();
    case 'relative':
      return getRelativeTime(timestamp);
    case 'short':
    default:
      return date.toLocaleTimeString();
  }
};

export const getRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
};

// Funciones de análisis de datos
export const calculateSensorStatistics = (readings: SensorReading[]) => {
  if (readings.length === 0) {
    return {
      count: 0,
      average: 0,
      min: 0,
      max: 0,
      latest: null,
      trend: 'stable' as 'up' | 'down' | 'stable'
    };
  }
  
  const values = readings.map(r => r.value);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = readings[readings.length - 1];
  
  // Calcular tendencia (últimos 10 vs anteriores 10)
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (readings.length >= 10) {
    const recent = readings.slice(-10).map(r => r.value);
    const previous = readings.slice(-20, -10).map(r => r.value);
    
    if (recent.length > 0 && previous.length > 0) {
      const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const previousAvg = previous.reduce((sum, val) => sum + val, 0) / previous.length;
      const difference = recentAvg - previousAvg;
      
      if (Math.abs(difference) > average * 0.05) { // 5% de cambio
        trend = difference > 0 ? 'up' : 'down';
      }
    }
  }
  
  return {
    count: readings.length,
    average: Math.round(average * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    latest,
    trend
  };
};

export const detectAnomalies = (readings: SensorReading[], thresholds?: SensorThresholds) => {
  const anomalies: Array<{
    reading: SensorReading;
    type: 'threshold' | 'outlier' | 'gap';
    severity: 'warning' | 'critical';
    message: string;
  }> = [];
  
  if (readings.length === 0) return anomalies;
  
  // Detectar violaciones de umbrales
  if (thresholds) {
    readings.forEach(reading => {
      const { value } = reading;
      
      // Umbrales críticos
      if (thresholds.critical) {
        if ((thresholds.critical.min !== undefined && value < thresholds.critical.min) ||
            (thresholds.critical.max !== undefined && value > thresholds.critical.max)) {
          anomalies.push({
            reading,
            type: 'threshold',
            severity: 'critical',
            message: `Valor crítico: ${value}`
          });
        }
      }
      
      // Umbrales de advertencia
      if (thresholds.warning) {
        if ((thresholds.warning.min !== undefined && value < thresholds.warning.min) ||
            (thresholds.warning.max !== undefined && value > thresholds.warning.max)) {
          anomalies.push({
            reading,
            type: 'threshold',
            severity: 'warning',
            message: `Valor fuera de rango: ${value}`
          });
        }
      }
    });
  }
  
  // Detectar valores atípicos (outliers) usando Z-score
  if (readings.length >= 10) {
    const values = readings.map(r => r.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev > 0) {
      readings.forEach(reading => {
        const zScore = Math.abs((reading.value - mean) / stdDev);
        
        if (zScore > 3) { // Más de 3 desviaciones estándar
          anomalies.push({
            reading,
            type: 'outlier',
            severity: 'warning',
            message: `Valor atípico detectado: ${reading.value} (Z-score: ${zScore.toFixed(2)})`
          });
        }
      });
    }
  }
  
  // Detectar gaps en los datos
  for (let i = 1; i < readings.length; i++) {
    const currentTime = new Date(readings[i].timestamp);
    const previousTime = new Date(readings[i - 1].timestamp);
    const gapMinutes = (currentTime.getTime() - previousTime.getTime()) / (1000 * 60);
    
    if (gapMinutes > 30) { // Gap mayor a 30 minutos
      anomalies.push({
        reading: readings[i],
        type: 'gap',
        severity: 'warning',
        message: `Gap en datos: ${Math.round(gapMinutes)} minutos sin lecturas`
      });
    }
  }
  
  return anomalies;
};

// Funciones de agrupación y filtrado
export const groupSensorsByType = (sensors: AnySensor[]): Record<string, AnySensor[]> => {
  return sensors.reduce((groups, sensor) => {
    const type = sensor.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(sensor);
    return groups;
  }, {} as Record<string, AnySensor[]>);
};

export const groupSensorsByLocation = (sensors: AnySensor[]): Record<string, AnySensor[]> => {
  return sensors.reduce((groups, sensor) => {
    const location = sensor.location?.spaceName || 'Sin ubicación';
    if (!groups[location]) {
      groups[location] = [];
    }
    groups[location].push(sensor);
    return groups;
  }, {} as Record<string, AnySensor[]>);
};

export const groupSensorsByStatus = (sensors: AnySensor[]): Record<string, AnySensor[]> => {
  return sensors.reduce((groups, sensor) => {
    const status = sensor.status;
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(sensor);
    return groups;
  }, {} as Record<string, AnySensor[]>);
};

export const filterSensorsByHealth = (sensors: AnySensor[], health: ReturnType<typeof getSensorHealth>): AnySensor[] => {
  return sensors.filter(sensor => getSensorHealth(sensor) === health);
};

export const filterSensorsByType = (sensors: AnySensor[], types: string[]): AnySensor[] => {
  return sensors.filter(sensor => types.includes(sensor.type));
};

export const filterSensorsWithRecentData = (sensors: AnySensor[], maxAgeMinutes: number = 10): AnySensor[] => {
  return sensors.filter(sensor => hasRecentReading(sensor, maxAgeMinutes));
};

// Funciones de ordenamiento
export const sortSensorsByName = (sensors: AnySensor[], ascending: boolean = true): AnySensor[] => {
  return [...sensors].sort((a, b) => {
    const comparison = a.name.localeCompare(b.name);
    return ascending ? comparison : -comparison;
  });
};

export const sortSensorsByLastReading = (sensors: AnySensor[], ascending: boolean = false): AnySensor[] => {
  return [...sensors].sort((a, b) => {
    const aTime = a.lastReading?.timestamp ? new Date(a.lastReading.timestamp).getTime() : 0;
    const bTime = b.lastReading?.timestamp ? new Date(b.lastReading.timestamp).getTime() : 0;
    const comparison = aTime - bTime;
    return ascending ? comparison : -comparison;
  });
};

export const sortSensorsByStatus = (sensors: AnySensor[]): AnySensor[] => {
  const statusPriority = {
    'error': 0,
    'active': 1,
    'maintenance': 2,
    'calibrating': 3,
    'inactive': 4
  };
  
  return [...sensors].sort((a, b) => {
    const aPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 5;
    const bPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 5;
    return aPriority - bPriority;
  });
};

// Funciones de exportación
export const exportSensorsToCSV = (sensors: AnySensor[]): string => {
  const headers = [
    'ID',
    'Nombre',
    'Tipo',
    'Estado',
    'Ubicación',
    'Último Valor',
    'Unidad',
    'Calidad',
    'Timestamp',
    'Es Real'
  ];
  
  const rows = sensors.map(sensor => [
    sensor.sensorId,
    sensor.name,
    sensor.type,
    sensor.status,
    sensor.location?.spaceName || '',
    sensor.lastReading?.value?.toString() || '',
    (sensor as any).config?.unit || '',
    sensor.lastReading?.quality || '',
    sensor.lastReading?.timestamp || '',
    isSensorReal(sensor) ? 'Sí' : 'No'
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
};

export const exportSensorReadingsToCSV = (readings: SensorReading[]): string => {
  const headers = ['Timestamp', 'Valor', 'Unidad', 'Calidad', 'Sensor ID'];
  
  const rows = readings.map(reading => [
    reading.timestamp,
    reading.value.toString(),
    reading.unit,
    reading.quality,
    reading.sensorId
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
};

// Función de búsqueda
export const searchSensors = (sensors: AnySensor[], query: string): AnySensor[] => {
  if (!query.trim()) return sensors;
  
  const lowerQuery = query.toLowerCase();
  
  return sensors.filter(sensor => 
    sensor.name.toLowerCase().includes(lowerQuery) ||
    sensor.sensorId.toLowerCase().includes(lowerQuery) ||
    sensor.type.toLowerCase().includes(lowerQuery) ||
    sensor.location?.spaceName?.toLowerCase().includes(lowerQuery) ||
    sensor.status.toLowerCase().includes(lowerQuery)
  );
};

// Función para generar reporte
export const generateSensorReport = (sensors: AnySensor[]) => {
  const totalSensors = sensors.length;
  const sensorsByType = groupSensorsByType(sensors);
  const sensorsByStatus = groupSensorsByStatus(sensors);
  const sensorsByLocation = groupSensorsByLocation(sensors);
  
  const healthSummary = {
    healthy: filterSensorsByHealth(sensors, 'healthy').length,
    warning: filterSensorsByHealth(sensors, 'warning').length,
    critical: filterSensorsByHealth(sensors, 'critical').length,
    offline: filterSensorsByHealth(sensors, 'offline').length
  };
  
  const recentData = filterSensorsWithRecentData(sensors, 10);
  const realSensors = sensors.filter(isSensorReal);
  const mockSensors = sensors.filter(isSensorMock);
  
  return {
    summary: {
      total: totalSensors,
      real: realSensors.length,
      mock: mockSensors.length,
      withRecentData: recentData.length,
      dataFreshness: totalSensors > 0 ? (recentData.length / totalSensors) * 100 : 0
    },
    health: healthSummary,
    distribution: {
      byType: Object.entries(sensorsByType).map(([type, sensors]) => ({
        type,
        count: sensors.length,
        percentage: (sensors.length / totalSensors) * 100
      })),
      byStatus: Object.entries(sensorsByStatus).map(([status, sensors]) => ({
        status,
        count: sensors.length,
        percentage: (sensors.length / totalSensors) * 100
      })),
      byLocation: Object.entries(sensorsByLocation).map(([location, sensors]) => ({
        location,
        count: sensors.length,
        percentage: (sensors.length / totalSensors) * 100
      }))
    }
  };
};