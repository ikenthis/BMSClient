// SensorDataService.ts - Servicio para obtener datos de sensores del backend
import { SpaceSensorData } from '../MapHoverManager';

export interface SensorAPIResponse {
  status: string;
  data: {
    sensors: Array<{
      sensorId: string;
      name: string;
      type: string;
      location: {
        spaceGuid: string;
        spaceName: string;
        floor: string;
        zone: string;
      };
      status: string;
      lastReading?: {
        value: number;
        unit: string;
        quality: string;
        timestamp: string;
        additionalData?: any;
      };
    }>;
  };
}

export interface SensorReadingsAPIResponse {
  status: string;
  data: {
    readings: Array<{
      sensorId: string;
      sensorName: string;
      sensorType: string;
      value: number;
      unit: string;
      quality: string;
      timestamp: string;
      location: {
        spaceGuid: string;
        spaceName: string;
      };
      additionalData?: {
        humidity?: number;
        heatIndex?: number;
        confidence?: number;
        capacity?: number;
        occupancyRate?: string;
      };
    }>;
  };
}

class SensorDataService {
  private baseURL: string;
  private cache: Map<string, { data: SpaceSensorData; timestamp: number }> = new Map();
  private cacheTimeout: number = 30000; // 30 segundos

  constructor(baseURL: string = '/api/iot') {
    this.baseURL = baseURL;
  }

  /**
   * Obtiene datos de sensores para un espacio específico
   */
  async getSpaceSensorData(spaceGuid: string): Promise<SpaceSensorData | null> {
    try {
      console.log(`📊 Obteniendo datos de sensores para espacio: ${spaceGuid.slice(-8)}...`);

      // Verificar cache
      const cached = this.cache.get(spaceGuid);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        console.log(`✅ Datos en cache para ${spaceGuid.slice(-8)}...`);
        return cached.data;
      }

      // Obtener sensores del espacio
      const sensorsResponse = await this.fetchSensorsBySpace(spaceGuid);
      if (!sensorsResponse || sensorsResponse.length === 0) {
        console.log(`⚠️ No se encontraron sensores para el espacio ${spaceGuid.slice(-8)}...`);
        return null;
      }

      // Obtener lecturas recientes de cada sensor
      const sensorReadings = await Promise.all(
        sensorsResponse.map(sensor => this.fetchSensorRecentReading(sensor.sensorId))
      );

      // Procesar y combinar datos
      const processedData = this.processSensorData(spaceGuid, sensorsResponse, sensorReadings);
      
      // Actualizar cache
      this.cache.set(spaceGuid, {
        data: processedData,
        timestamp: Date.now()
      });

      console.log(`✅ Datos obtenidos para ${processedData.spaceName}: ${processedData.sensors.length} sensores`);
      return processedData;

    } catch (error) {
      console.error(`❌ Error obteniendo datos de sensores para ${spaceGuid}:`, error);
      return null;
    }
  }

  /**
   * Obtiene sensores de un espacio específico
   */
  private async fetchSensorsBySpace(spaceGuid: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/sensors/space/${spaceGuid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SensorAPIResponse = await response.json();
      
      if (data.status === 'success' && data.data && data.data.sensors) {
        return data.data.sensors.filter(sensor => 
          sensor.status === 'active' && 
          (sensor.type === 'temperature' || sensor.type === 'occupancy')
        );
      }

      return [];
    } catch (error) {
      console.error('Error fetching sensors by space:', error);
      return [];
    }
  }

  /**
   * Obtiene la lectura más reciente de un sensor
   */
  private async fetchSensorRecentReading(sensorId: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseURL}/sensors/${sensorId}/readings?limit=1`);
      
      if (!response.ok) {
        return null;
      }

      const data: SensorReadingsAPIResponse = await response.json();
      
      if (data.status === 'success' && data.data && data.data.readings && data.data.readings.length > 0) {
        return data.data.readings[0];
      }

      return null;
    } catch (error) {
      console.warn(`⚠️ Error obteniendo lectura de sensor ${sensorId}:`, error);
      return null;
    }
  }

  /**
   * Procesa y combina los datos de sensores en el formato esperado
   */
  private processSensorData(
    spaceGuid: string, 
    sensors: any[], 
    readings: (any | null)[]
  ): SpaceSensorData {
    const spaceName = sensors[0]?.location?.spaceName || 'Espacio sin nombre';
    
    // Procesar sensores con sus lecturas
    const processedSensors = sensors.map((sensor, index) => {
      const reading = readings[index];
      
      return {
        sensorId: sensor.sensorId,
        sensorName: sensor.name,
        type: sensor.type as 'temperature' | 'occupancy',
        value: reading?.value || 0,
        unit: reading?.unit || (sensor.type === 'temperature' ? '°C' : 'personas'),
        quality: reading?.quality || 'error',
        timestamp: reading?.timestamp || new Date().toISOString(),
        additionalData: reading?.additionalData || {}
      };
    }).filter(sensor => sensor.value !== undefined);

    // Calcular valores agregados para el espacio
    const temperatureSensors = processedSensors.filter(s => s.type === 'temperature');
    const occupancySensors = processedSensors.filter(s => s.type === 'occupancy');

    const avgTemperature = temperatureSensors.length > 0 
      ? temperatureSensors.reduce((sum, s) => sum + s.value, 0) / temperatureSensors.length
      : undefined;

    const totalOccupancy = occupancySensors.length > 0
      ? occupancySensors.reduce((sum, s) => sum + s.value, 0)
      : undefined;

    // Calcular humedad promedio si está disponible
    const temperatureReadingsWithHumidity = temperatureSensors.filter(s => 
      s.additionalData && s.additionalData.humidity !== undefined
    );
    
    const avgHumidity = temperatureReadingsWithHumidity.length > 0
      ? temperatureReadingsWithHumidity.reduce((sum, s) => sum + s.additionalData.humidity, 0) / temperatureReadingsWithHumidity.length
      : undefined;

    // Determinar calidad general del espacio
    const allQualities = processedSensors.map(s => s.quality);
    const overallQuality = this.determineOverallQuality(allQualities);

    // Timestamp más reciente
    const latestTimestamp = processedSensors.reduce((latest, sensor) => {
      const sensorTime = new Date(sensor.timestamp).getTime();
      const latestTime = new Date(latest).getTime();
      return sensorTime > latestTime ? sensor.timestamp : latest;
    }, processedSensors[0]?.timestamp || new Date().toISOString());

    return {
      spaceGuid,
      spaceName,
      temperature: avgTemperature,
      humidity: avgHumidity,
      occupancy: totalOccupancy,
      quality: overallQuality,
      timestamp: latestTimestamp,
      sensors: processedSensors
    };
  }

  /**
   * Determina la calidad general basada en las calidades individuales
   */
  private determineOverallQuality(qualities: string[]): 'good' | 'warning' | 'critical' | 'error' {
    if (qualities.includes('error')) return 'error';
    if (qualities.includes('critical')) return 'critical';
    if (qualities.includes('warning')) return 'warning';
    return 'good';
  }

  /**
   * Obtiene múltiples espacios con datos de sensores
   */
  async getMultipleSpacesData(spaceGuids: string[]): Promise<Map<string, SpaceSensorData>> {
    const results = new Map<string, SpaceSensorData>();
    
    const promises = spaceGuids.map(async (spaceGuid) => {
      const data = await this.getSpaceSensorData(spaceGuid);
      if (data) {
        results.set(spaceGuid, data);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Obtiene datos de un sensor específico con estadísticas
   */
  async getSensorStatistics(sensorId: string, hours: number = 24): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/sensors/${sensorId}/statistics?hours=${hours}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.status === 'success' ? data.data.statistics : null;
    } catch (error) {
      console.error(`Error fetching sensor statistics for ${sensorId}:`, error);
      return null;
    }
  }

  /**
   * Obtiene lecturas por rango de tiempo
   */
  async getSensorReadingsByTimeRange(
    sensorId: string, 
    start: string, 
    end: string, 
    limit: number = 100
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        start,
        end,
        limit: limit.toString()
      });

      const response = await fetch(`${this.baseURL}/sensors/${sensorId}/readings/range?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SensorReadingsAPIResponse = await response.json();
      return data.status === 'success' && data.data ? data.data.readings : [];
    } catch (error) {
      console.error(`Error fetching sensor readings for ${sensorId}:`, error);
      return [];
    }
  }

  /**
   * Limpia el cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache de datos de sensores limpiado');
  }

  /**
   * Configura el timeout del cache
   */
  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
    console.log(`⏱️ Timeout de cache configurado a ${timeout}ms`);
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats(): { size: number; timeout: number } {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout
    };
  }

  /**
   * Método para testing - simula datos de sensores
   */
  async getTestSpaceData(spaceGuid: string, spaceName: string): Promise<SpaceSensorData> {
    console.log(`🧪 Generando datos de prueba para ${spaceName}`);
    
    const now = new Date().toISOString();
    const temperatureValue = 20 + Math.random() * 8; // 20-28°C
    const occupancyValue = Math.floor(Math.random() * 25); // 0-25 personas
    const humidity = 40 + Math.random() * 20; // 40-60%

    return {
      spaceGuid,
      spaceName,
      temperature: temperatureValue,
      humidity,
      occupancy: occupancyValue,
      quality: temperatureValue > 26 ? 'warning' : temperatureValue > 28 ? 'critical' : 'good',
      timestamp: now,
      sensors: [
        {
          sensorId: `TEMP-${spaceGuid.slice(-4)}`,
          sensorName: `Sensor Temperatura ${spaceName}`,
          type: 'temperature',
          value: temperatureValue,
          unit: '°C',
          quality: temperatureValue > 26 ? 'warning' : 'good',
          timestamp: now,
          additionalData: {
            humidity,
            heatIndex: temperatureValue + (humidity * 0.1)
          }
        },
        {
          sensorId: `OCC-${spaceGuid.slice(-4)}`,
          sensorName: `Sensor Ocupación ${spaceName}`,
          type: 'occupancy',
          value: occupancyValue,
          unit: 'personas',
          quality: occupancyValue > 20 ? 'warning' : 'good',
          timestamp: now,
          additionalData: {
            capacity: 30,
            occupancyRate: `${Math.round((occupancyValue / 30) * 100)}%`,
            confidence: 85 + Math.random() * 10
          }
        }
      ]
    };
  }
}

// Exportar instancia singleton
export const sensorDataService = new SensorDataService();

export default sensorDataService;