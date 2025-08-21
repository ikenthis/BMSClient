// sensorSpaceIntegrationService.ts - Servicio de integración entre sensores IoT y espacios 3D
import { 
  Sensor, 
  SensorReading, 
  fetchAllSensors, 
  fetchSensorReadings,
  getSensorsBySpace3D,
  getHeatMapData,
  wsManager
} from '../../../services/sensorApiService';
import { HeatMapData, heatMapVisualization } from '../utils/HeatMapVisualization';
import { SpaceElement } from '../../../utils/typeDefs';

export interface SensorSpaceMapping {
  sensorId: string;
  spaceGuid: string;
  spaceName: string;
  sensor: Sensor;
  lastReading?: SensorReading;
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

class SensorSpaceIntegrationService {
  private spacesCache: SpaceElement[] = [];
  private sensorSpaceMappings: Map<string, SensorSpaceMapping> = new Map();
  private spacesBySensor: Map<string, string> = new Map(); // sensorId -> spaceGuid
  private sensorsBySpace: Map<string, string[]> = new Map(); // spaceGuid -> sensorIds[]
  private isInitialized: boolean = false;
  private updateInterval: number | null = null;

  /**
   * Inicializa el servicio de integración
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔌 Inicializando integración sensor-espacio...');
      
      // Cargar sensores existentes
      await this.loadSensors();
      
      // Configurar WebSocket para actualizaciones en tiempo real
      this.setupWebSocketListeners();
      
      // Iniciar actualización periódica
      this.startPeriodicUpdates();
      
      this.isInitialized = true;
      console.log('✅ Integración sensor-espacio inicializada');
      
    } catch (error) {
      console.error('❌ Error inicializando integración:', error);
      throw error;
    }
  }

  /**
   * Carga todos los sensores y sus mapeos
   */
  private async loadSensors(): Promise<void> {
    try {
      const sensors = await fetchAllSensors();
      console.log(`📡 Cargados ${sensors.length} sensores`);
      
      for (const sensor of sensors) {
        await this.processSensor(sensor);
      }
      
      console.log(`🗺️ Mapeados ${this.sensorSpaceMappings.size} sensores a espacios`);
      
      // Disparar evento de actualización
      this.notifyMappingUpdate();
      
    } catch (error) {
      console.error('Error cargando sensores:', error);
    }
  }

  /**
   * Procesa un sensor individual y lo mapea a espacios
   */
  private async processSensor(sensor: Sensor): Promise<void> {
    // Solo procesar sensores que tienen ubicación de espacio
    if (!sensor.location?.spaceGuid) {
      console.log(`⚠️ Sensor ${sensor.sensorId} no tiene spaceGuid`);
      return;
    }
    
    const spaceGuid = sensor.location.spaceGuid;
    const spaceName = sensor.location.spaceName || 'Espacio sin nombre';
    
    // Verificar que el espacio existe en nuestro cache
    const spaceExists = this.spacesCache.some(space => 
      space.properties?.globalId === spaceGuid
    );
    
    if (!spaceExists) {
      console.log(`⚠️ Espacio ${spaceGuid} no encontrado en modelo 3D`);
      // Aún procesar el sensor, pero marcar como no encontrado
    }
    
    // Obtener última lectura si está disponible
    let lastReading: SensorReading | undefined;
    try {
      const readings = await fetchSensorReadings(sensor.sensorId, 1);
      lastReading = readings[0];
    } catch (error) {
      console.warn(`No se pudo obtener lectura para sensor ${sensor.sensorId}`);
    }
    
    // Crear mapeo
    const mapping: SensorSpaceMapping = {
      sensorId: sensor.sensorId,
      spaceGuid,
      spaceName,
      sensor,
      lastReading,
      position: this.calculateSensorPosition(spaceGuid)
    };
    
    // Guardar mapeos
    this.sensorSpaceMappings.set(sensor.sensorId, mapping);
    this.spacesBySensor.set(sensor.sensorId, spaceGuid);
    
    // Actualizar índice por espacio
    if (!this.sensorsBySpace.has(spaceGuid)) {
      this.sensorsBySpace.set(spaceGuid, []);
    }
    this.sensorsBySpace.get(spaceGuid)!.push(sensor.sensorId);
    
    console.log(`✅ Sensor ${sensor.sensorId} mapeado a espacio ${spaceName}`);
  }

  /**
   * Calcula la posición del sensor dentro del espacio (placeholder)
   */
  private calculateSensorPosition(spaceGuid: string): { x: number; y: number; z: number } | undefined {
    // Buscar el espacio en el cache
    const space = this.spacesCache.find(s => s.properties?.globalId === spaceGuid);
    
    if (space && space.position) {
      // Posicionar sensor en el centro del espacio, ligeramente elevado
      return {
        x: space.position.x,
        y: space.position.y + 2, // 2 metros arriba del suelo
        z: space.position.z
      };
    }
    
    return undefined;
  }

  /**
   * Configura los listeners de WebSocket para actualizaciones en tiempo real
   */
  private setupWebSocketListeners(): void {
    // Escuchar nuevas lecturas de sensores
    wsManager.subscribeAll((data) => {
      if (data.type === 'reading' && data.sensorId) {
        this.handleSensorReading(data);
      }
    });
    
    // Escuchar cambios en configuración de sensores
    wsManager.subscribe('system', (data) => {
      if (data.type === 'sensor_updated' || data.type === 'sensor_added') {
        this.loadSensors(); // Recargar sensores
      }
    });
    
    console.log('📡 WebSocket listeners configurados');
  }

  /**
   * Maneja una nueva lectura de sensor
   */
  private handleSensorReading(reading: any): void {
    const mapping = this.sensorSpaceMappings.get(reading.sensorId);
    if (!mapping) return;
    
    // Actualizar última lectura
    mapping.lastReading = {
      _id: reading._id || Date.now().toString(),
      sensorId: reading.sensorId,
      value: reading.value,
      unit: reading.unit || '°C',
      quality: reading.quality || 'good',
      timestamp: reading.timestamp || new Date().toISOString(),
      additionalData: reading.additionalData
    };
    
    // Generar datos de mapa de calor
    this.updateHeatMapForSpace(mapping.spaceGuid);
    
    console.log(`🌡️ Lectura actualizada: ${reading.value}${reading.unit} en ${mapping.spaceName}`);
  }

  /**
   * Actualiza el mapa de calor para un espacio específico
   */
  private updateHeatMapForSpace(spaceGuid: string): void {
    const sensorIds = this.sensorsBySpace.get(spaceGuid);
    if (!sensorIds || sensorIds.length === 0) return;
    
    // Obtener todos los sensores de este espacio
    const spaceSensors = sensorIds
      .map(id => this.sensorSpaceMappings.get(id))
      .filter(mapping => mapping && mapping.lastReading) as SensorSpaceMapping[];
    
    if (spaceSensors.length === 0) return;
    
    // Calcular temperatura promedio para el espacio
    const temperatures = spaceSensors
      .filter(s => s.sensor.type === 'temperature' && s.lastReading)
      .map(s => s.lastReading!.value);
    
    if (temperatures.length === 0) return;
    
    const avgTemperature = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
    
    // Obtener otros datos si están disponibles
    const humidityReadings = spaceSensors
      .filter(s => s.lastReading?.additionalData?.humidity)
      .map(s => s.lastReading!.additionalData!.humidity!);
    
    const occupancyReadings = spaceSensors
      .filter(s => s.sensor.type === 'occupancy' && s.lastReading)
      .map(s => s.lastReading!.value);
    
    // Determinar calidad general
    const qualities = spaceSensors.map(s => s.lastReading!.quality);
    const overallQuality = this.determineOverallQuality(qualities);
    
    // Crear datos de mapa de calor
    const heatMapData: HeatMapData = {
      spaceGuid,
      spaceName: spaceSensors[0].spaceName,
      temperature: avgTemperature,
      humidity: humidityReadings.length > 0 
        ? humidityReadings.reduce((sum, h) => sum + h, 0) / humidityReadings.length 
        : undefined,
      occupancy: occupancyReadings.length > 0
        ? occupancyReadings.reduce((sum, o) => sum + o, 0) / occupancyReadings.length
        : undefined,
      timestamp: new Date().toISOString(),
      quality: overallQuality
    };
    
    // Actualizar visualización
    heatMapVisualization.updateHeatMapData([heatMapData]);
    
    // Disparar evento personalizado
    window.dispatchEvent(new CustomEvent('heatMapUpdate', { 
      detail: heatMapData 
    }));
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
   * Inicia actualizaciones periódicas
   */
  private startPeriodicUpdates(): void {
    this.updateInterval = window.setInterval(async () => {
      try {
        await this.updateAllSpaceHeatMaps();
      } catch (error) {
        console.warn('Error en actualización periódica:', error);
      }
    }, 30000); // Cada 30 segundos
  }

  /**
   * Actualiza todos los mapas de calor de espacios
   */
  private async updateAllSpaceHeatMaps(): Promise<void> {
    for (const spaceGuid of this.sensorsBySpace.keys()) {
      this.updateHeatMapForSpace(spaceGuid);
    }
  }

  /**
   * Dispara evento de actualización de mapeo
   */
  private notifyMappingUpdate(): void {
    window.dispatchEvent(new CustomEvent('sensorMappingUpdate', {
      detail: {
        mappings: Array.from(this.sensorSpaceMappings.values()),
        spaceCount: this.sensorsBySpace.size,
        sensorCount: this.sensorSpaceMappings.size
      }
    }));
  }

  /**
   * Métodos públicos
   */
  
  setSpacesCache(spaces: SpaceElement[]): void {
    this.spacesCache = spaces;
    console.log(`📐 Cache de espacios actualizado: ${spaces.length} espacios`);
    
    // Recargar sensores para actualizar mapeos
    if (this.isInitialized) {
      this.loadSensors();
    }
  }

  getSensorsBySpace(spaceGuid: string): SensorSpaceMapping[] {
    const sensorIds = this.sensorsBySpace.get(spaceGuid) || [];
    return sensorIds
      .map(id => this.sensorSpaceMappings.get(id))
      .filter(mapping => mapping) as SensorSpaceMapping[];
  }

  getSpacesBySensor(): Map<string, string> {
    return new Map(this.spacesBySensor);
  }

  getAllMappings(): SensorSpaceMapping[] {
    return Array.from(this.sensorSpaceMappings.values());
  }

  getSpacesWithSensors(): string[] {
    return Array.from(this.sensorsBySpace.keys());
  }

  async refreshSensorData(): Promise<void> {
    console.log('🔄 Refrescando datos de sensores...');
    await this.loadSensors();
  }

  /**
   * Mapea manualmente un sensor a un espacio
   */
  async mapSensorToSpace(sensorId: string, spaceGuid: string, spaceName: string): Promise<void> {
    try {
      // Buscar el sensor
      const sensors = await fetchAllSensors();
      const sensor = sensors.find(s => s.sensorId === sensorId);
      
      if (!sensor) {
        throw new Error(`Sensor ${sensorId} no encontrado`);
      }
      
      // Crear/actualizar mapeo
      const mapping: SensorSpaceMapping = {
        sensorId,
        spaceGuid,
        spaceName,
        sensor,
        position: this.calculateSensorPosition(spaceGuid)
      };
      
      // Obtener última lectura
      try {
        const readings = await fetchSensorReadings(sensorId, 1);
        mapping.lastReading = readings[0];
      } catch (error) {
        console.warn(`No se pudo obtener lectura para sensor ${sensorId}`);
      }
      
      // Actualizar mapeos
      this.sensorSpaceMappings.set(sensorId, mapping);
      this.spacesBySensor.set(sensorId, spaceGuid);
      
      // Actualizar índice por espacio
      if (!this.sensorsBySpace.has(spaceGuid)) {
        this.sensorsBySpace.set(spaceGuid, []);
      }
      const spaceSensors = this.sensorsBySpace.get(spaceGuid)!;
      if (!spaceSensors.includes(sensorId)) {
        spaceSensors.push(sensorId);
      }
      
      // Actualizar mapa de calor
      this.updateHeatMapForSpace(spaceGuid);
      
      // Notificar cambios
      this.notifyMappingUpdate();
      
      console.log(`✅ Sensor ${sensorId} mapeado manualmente a ${spaceName}`);
      
    } catch (error) {
      console.error('Error mapeando sensor:', error);
      throw error;
    }
  }

  /**
   * Desmapea un sensor de un espacio
   */
  unmapSensor(sensorId: string): void {
    const mapping = this.sensorSpaceMappings.get(sensorId);
    if (!mapping) return;
    
    const spaceGuid = mapping.spaceGuid;
    
    // Remover mapeos
    this.sensorSpaceMappings.delete(sensorId);
    this.spacesBySensor.delete(sensorId);
    
    // Actualizar índice por espacio
    const spaceSensors = this.sensorsBySpace.get(spaceGuid);
    if (spaceSensors) {
      const index = spaceSensors.indexOf(sensorId);
      if (index > -1) {
        spaceSensors.splice(index, 1);
      }
      
      // Si no quedan sensores en el espacio, remover entrada
      if (spaceSensors.length === 0) {
        this.sensorsBySpace.delete(spaceGuid);
      }
    }
    
    // Notificar cambios
    this.notifyMappingUpdate();
    
    console.log(`🗑️ Sensor ${sensorId} desmapeado`);
  }

  /**
   * Obtiene estadísticas de la integración
   */
  getIntegrationStats() {
    const totalSensors = this.sensorSpaceMappings.size;
    const spacesWithSensors = this.sensorsBySpace.size;
    const sensorsWithReadings = Array.from(this.sensorSpaceMappings.values())
      .filter(m => m.lastReading).length;
    
    const sensorsByType = new Map<string, number>();
    this.sensorSpaceMappings.forEach(mapping => {
      const type = mapping.sensor.type;
      sensorsByType.set(type, (sensorsByType.get(type) || 0) + 1);
    });
    
    return {
      totalSensors,
      spacesWithSensors,
      sensorsWithReadings,
      sensorsByType: Object.fromEntries(sensorsByType),
      spacesAvailable: this.spacesCache.length,
      integrationRate: this.spacesCache.length > 0 
        ? (spacesWithSensors / this.spacesCache.length * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Limpia todos los recursos
   */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.sensorSpaceMappings.clear();
    this.spacesBySensor.clear();
    this.sensorsBySpace.clear();
    this.spacesCache = [];
    this.isInitialized = false;
    
    console.log('🧹 SensorSpaceIntegration disposed');
  }

  /**
   * Getters de estado
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  get hasMappings(): boolean {
    return this.sensorSpaceMappings.size > 0;
  }

  get mappingCount(): number {
    return this.sensorSpaceMappings.size;
  }
}

// Exportar instancia singleton
export const sensorSpaceIntegration = new SensorSpaceIntegrationService();

export default sensorSpaceIntegration;