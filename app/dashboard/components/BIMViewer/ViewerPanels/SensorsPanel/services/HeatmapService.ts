// HeatmapService.ts
import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import { Sensor } from '../../../services/sensorApiService';

export interface HeatmapData {
  spaceGuid: string;
  spaceName: string;
  value: number;
  sensorType: 'temperature' | 'occupancy';
  sensorId: string;
  timestamp: string;
  quality: 'good' | 'warning' | 'critical' | 'error';
}

export interface HeatmapConfig {
  temperatureRange: { min: number; max: number };
  occupancyRange: { min: number; max: number };
  colorScheme: 'thermal' | 'rainbow' | 'custom';
  opacity: number;
  updateInterval: number;
  showLegend: boolean;
}

export interface SensorAssociation {
  id: string;
  sensorId: string;
  spaceGuid: string;
  spaceName: string;
  sensorName: string;
  sensorType: string;
  isActive: boolean;
}

class HeatmapService {
  private world: any = null;
  private fragments: FRAGS.FragmentsModels | null = null;
  private models: FRAGS.FragmentsModel[] = [];
  private heatmapData: Map<string, HeatmapData> = new Map();
  private associations: SensorAssociation[] = [];
  private config: HeatmapConfig = {
    temperatureRange: { min: 18, max: 30 },
    occupancyRange: { min: 0, max: 20 },
    colorScheme: 'thermal',
    opacity: 0.7,
    updateInterval: 5000,
    showLegend: true
  };
  private isEnabled = false;
  private originalMaterials: Map<string, any> = new Map();
  private updateTimer: number | null = null;

  // Esquemas de color
  private colorSchemes = {
    thermal: {
      cold: new THREE.Color(0x0066ff),    // Azul frío
      cool: new THREE.Color(0x00ffff),    // Cian
      medium: new THREE.Color(0x00ff00),  // Verde
      warm: new THREE.Color(0xffff00),    // Amarillo
      hot: new THREE.Color(0xff6600),     // Naranja
      extreme: new THREE.Color(0xff0000)  // Rojo
    },
    rainbow: {
      cold: new THREE.Color(0x800080),    // Púrpura
      cool: new THREE.Color(0x0000ff),    // Azul
      medium: new THREE.Color(0x00ff00),  // Verde
      warm: new THREE.Color(0xffff00),    // Amarillo
      hot: new THREE.Color(0xff8000),     // Naranja
      extreme: new THREE.Color(0xff0000)  // Rojo
    }
  };

  initialize(world: any, fragments: FRAGS.FragmentsHandler, models: FRAGS.FragmentsModel[]) {
    this.world = world;
    this.fragments = fragments;
    this.models = models;
    this.loadAssociations();
    console.log('HeatmapService initialized');
  }

  private loadAssociations() {
    const stored = localStorage.getItem('sensor-space-associations');
    if (stored) {
      this.associations = JSON.parse(stored);
      console.log(`Loaded ${this.associations.length} sensor-space associations`);
    }
  }

  updateAssociations(associations: SensorAssociation[]) {
    this.associations = associations;
    if (this.isEnabled) {
      this.refreshHeatmap();
    }
  }

  updateSensorData(sensors: Sensor[]) {
    // Actualizar datos del mapa de calor basado en sensores
    for (const sensor of sensors) {
      const association = this.associations.find(a => a.sensorId === sensor.sensorId);
      if (association && sensor.lastReading) {
        const heatmapData: HeatmapData = {
          spaceGuid: association.spaceGuid,
          spaceName: association.spaceName,
          value: sensor.lastReading.value,
          sensorType: sensor.type as 'temperature' | 'occupancy',
          sensorId: sensor.sensorId,
          timestamp: sensor.lastReading.timestamp,
          quality: sensor.lastReading.quality as any
        };
        
        this.heatmapData.set(association.spaceGuid, heatmapData);
      }
    }

    if (this.isEnabled) {
      this.applyHeatmap();
    }
  }

  enable() {
    if (!this.world || !this.fragments || this.models.length === 0) {
      console.warn('HeatmapService not properly initialized');
      return false;
    }

    this.isEnabled = true;
    this.saveOriginalMaterials();
    this.applyHeatmap();
    this.startAutoUpdate();
    console.log('Heatmap enabled');
    return true;
  }

  disable() {
    this.isEnabled = false;
    this.restoreOriginalMaterials();
    this.stopAutoUpdate();
    console.log('Heatmap disabled');
  }

  isHeatmapEnabled(): boolean {
    return this.isEnabled;
  }

  hasData(): boolean {
    return this.heatmapData.size > 0 && this.associations.length > 0;
  }

  getConfig(): HeatmapConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<HeatmapConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.isEnabled) {
      this.applyHeatmap();
    }
  }

  private saveOriginalMaterials() {
    this.originalMaterials.clear();
    
    for (const model of this.models) {
      try {
        // Guardar materiales originales de espacios
        model.getItemsOfCategory('IFCSPACE').then(async (items) => {
          for (const item of items) {
            const localId = await item.getLocalId();
            if (localId !== null) {
              // Almacenar el material original si existe
              const materialKey = `${model.id}-${localId}`;
              // Aquí guardaríamos el material original del fragmento
              this.originalMaterials.set(materialKey, null); // Placeholder
            }
          }
        });
      } catch (error) {
        console.warn('Error saving original materials for model:', model.id);
      }
    }
  }

  private restoreOriginalMaterials() {
    if (!this.fragments) return;

    for (const model of this.models) {
      try {
        model.getItemsOfCategory('IFCSPACE').then(async (items) => {
          const localIds: number[] = [];
          
          for (const item of items) {
            const localId = await item.getLocalId();
            if (localId !== null) {
              localIds.push(localId);
            }
          }
          
          if (localIds.length > 0) {
            // Restaurar material original o eliminar highlight
            await model.resetHighlight(localIds);
          }
        });
      } catch (error) {
        console.warn('Error restoring materials for model:', model.id);
      }
    }

    if (this.fragments) {
      this.fragments.update(true);
    }
  }

  private async applyHeatmap() {
    if (!this.fragments || this.heatmapData.size === 0) return;

    for (const model of this.models) {
      try {
        const items = await model.getItemsOfCategory('IFCSPACE');
        
        for (const item of items) {
          const localId = await item.getLocalId();
          if (localId === null) continue;

          // Obtener GUID del espacio
          const guid = await item.getGuid();
          const heatmapData = this.heatmapData.get(guid);
          
          if (heatmapData) {
            const color = this.calculateColor(heatmapData);
            const material: FRAGS.MaterialDefinition = {
              color: color,
              opacity: this.config.opacity,
              transparent: true,
              renderedFaces: FRAGS.RenderedFaces.TWO
            };

            await model.highlight([localId], material);
          }
        }
      } catch (error) {
        console.warn('Error applying heatmap to model:', model.id);
      }
    }

    this.fragments.update(true);
  }

  private calculateColor(data: HeatmapData): THREE.Color {
    const scheme = this.colorSchemes[this.config.colorScheme] || this.colorSchemes.thermal;
    let normalizedValue: number;

    // Normalizar valor según el tipo de sensor
    if (data.sensorType === 'temperature') {
      const { min, max } = this.config.temperatureRange;
      normalizedValue = Math.max(0, Math.min(1, (data.value - min) / (max - min)));
    } else if (data.sensorType === 'occupancy') {
      const { min, max } = this.config.occupancyRange;
      normalizedValue = Math.max(0, Math.min(1, (data.value - min) / (max - min)));
    } else {
      normalizedValue = 0.5; // Valor por defecto
    }

    // Ajustar por calidad del sensor
    if (data.quality === 'error') {
      return new THREE.Color(0x808080); // Gris para errores
    } else if (data.quality === 'warning') {
      normalizedValue *= 0.8; // Reducir intensidad para advertencias
    }

    // Interpolar color basado en el valor normalizado
    if (normalizedValue <= 0.2) {
      return scheme.cold.clone().lerp(scheme.cool, normalizedValue * 5);
    } else if (normalizedValue <= 0.4) {
      return scheme.cool.clone().lerp(scheme.medium, (normalizedValue - 0.2) * 5);
    } else if (normalizedValue <= 0.6) {
      return scheme.medium.clone().lerp(scheme.warm, (normalizedValue - 0.4) * 5);
    } else if (normalizedValue <= 0.8) {
      return scheme.warm.clone().lerp(scheme.hot, (normalizedValue - 0.6) * 5);
    } else {
      return scheme.hot.clone().lerp(scheme.extreme, (normalizedValue - 0.8) * 5);
    }
  }

  private startAutoUpdate() {
    this.stopAutoUpdate();
    this.updateTimer = window.setInterval(() => {
      if (this.isEnabled) {
        this.refreshHeatmap();
      }
    }, this.config.updateInterval);
  }

  private stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private refreshHeatmap() {
    // Aquí podrías hacer una nueva consulta a la API de sensores
    // Por ahora solo reaplicamos el mapa de calor existente
    this.applyHeatmap();
  }

  getHeatmapData(): HeatmapData[] {
    return Array.from(this.heatmapData.values());
  }

  getDataForSpace(spaceGuid: string): HeatmapData | null {
    return this.heatmapData.get(spaceGuid) || null;
  }

  // Métodos para estadísticas
  getTemperatureStats() {
    const tempData = Array.from(this.heatmapData.values())
      .filter(d => d.sensorType === 'temperature');
    
    if (tempData.length === 0) return null;

    const values = tempData.map(d => d.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    };
  }

  getOccupancyStats() {
    const occData = Array.from(this.heatmapData.values())
      .filter(d => d.sensorType === 'occupancy');
    
    if (occData.length === 0) return null;

    const values = occData.map(d => d.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
      total: values.reduce((a, b) => a + b, 0)
    };
  }

  // Limpiar recursos
  dispose() {
    this.disable();
    this.heatmapData.clear();
    this.originalMaterials.clear();
    this.associations = [];
    this.world = null;
    this.fragments = null;
    this.models = [];
    console.log('HeatmapService disposed');
  }

  // Métodos adicionales para debugging y utilidades
  getAssociationsCount(): number {
    return this.associations.length;
  }

  getActiveSpacesCount(): number {
    return this.heatmapData.size;
  }

  getAssociationForSpace(spaceGuid: string): SensorAssociation | null {
    return this.associations.find(a => a.spaceGuid === spaceGuid) || null;
  }

  getAssociationForSensor(sensorId: string): SensorAssociation | null {
    return this.associations.find(a => a.sensorId === sensorId) || null;
  }

  // Método para exportar configuración
  exportConfig(): string {
    return JSON.stringify({
      config: this.config,
      associations: this.associations
    }, null, 2);
  }

  // Método para importar configuración
  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      if (imported.config) {
        this.config = { ...this.config, ...imported.config };
      }
      if (imported.associations) {
        this.associations = imported.associations;
        localStorage.setItem('sensor-space-associations', JSON.stringify(this.associations));
      }
      console.log('Configuration imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing configuration:', error);
      return false;
    }
  }

  // Método para obtener el estado del servicio
  getServiceStatus() {
    return {
      initialized: this.world !== null && this.fragments !== null,
      enabled: this.isEnabled,
      modelsCount: this.models.length,
      associationsCount: this.associations.length,
      activeSpacesCount: this.heatmapData.size,
      hasData: this.hasData(),
      config: this.config
    };
  }

  // Método para validar datos de entrada
  private validateSensorData(sensor: Sensor): boolean {
    return !!(
      sensor.sensorId &&
      sensor.lastReading &&
      typeof sensor.lastReading.value === 'number' &&
      sensor.lastReading.timestamp &&
      (sensor.type === 'temperature' || sensor.type === 'occupancy')
    );
  }

  // Método para limpiar datos obsoletos
  cleanupOldData(maxAge: number = 300000): number { // 5 minutos por defecto
    const now = Date.now();
    let removedCount = 0;

    for (const [spaceGuid, data] of this.heatmapData.entries()) {
      const dataAge = now - new Date(data.timestamp).getTime();
      if (dataAge > maxAge) {
        this.heatmapData.delete(spaceGuid);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old heatmap data entries`);
      if (this.isEnabled) {
        this.applyHeatmap();
      }
    }

    return removedCount;
  }

  // Método para forzar actualización desde sensores específicos
  updateFromSpecificSensors(sensorIds: string[], sensors: Sensor[]): number {
    let updatedCount = 0;
    
    for (const sensorId of sensorIds) {
      const sensor = sensors.find(s => s.sensorId === sensorId);
      if (sensor && this.validateSensorData(sensor)) {
        const association = this.associations.find(a => a.sensorId === sensorId);
        if (association) {
          const heatmapData: HeatmapData = {
            spaceGuid: association.spaceGuid,
            spaceName: association.spaceName,
            value: sensor.lastReading!.value,
            sensorType: sensor.type as 'temperature' | 'occupancy',
            sensorId: sensor.sensorId,
            timestamp: sensor.lastReading!.timestamp,
            quality: sensor.lastReading!.quality as any
          };
          
          this.heatmapData.set(association.spaceGuid, heatmapData);
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0 && this.isEnabled) {
      this.applyHeatmap();
    }

    return updatedCount;
  }
}

// Singleton instanc
export const heatmapService = new HeatmapService();
export default heatmapService;