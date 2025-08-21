// SimpleHeatMapSystem.ts - Sistema simplificado de heatmap que usa tu highlightUtils existente
"use client";

import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';

// Usar tu HighlightMaterial existente
import { 
  tempHighlightMaterial,
  highlightMultipleElements,
  resetMultipleHighlights
} from '../../../utils/highlightUtils';

export interface HeatMapData {
  spaceGuid: string;
  spaceName: string;
  temperature: number;
  humidity?: number;
  occupancy?: number;
  timestamp: string;
  quality: 'good' | 'warning' | 'critical' | 'error';
}

export interface SimpleHeatMapConfig {
  temperatureRange: {
    min: number;
    max: number;
    optimal: { min: number; max: number };
  };
  colorScheme: {
    cold: string;
    optimal: string;
    warm: string;
    hot: string;
    noData: string;
  };
  opacity: number;
}

class SimpleHeatMapSystem {
  private fragments: FRAGS.FragmentsModels | null = null;
  private isActive: boolean = false;
  private heatMapData: Map<string, HeatMapData> = new Map();
  private highlightedSpaces: Map<string, { model: FRAGS.FragmentsModel; localIds: number[] }> = new Map();

  private config: SimpleHeatMapConfig = {
    temperatureRange: {
      min: 16,
      max: 30,
      optimal: { min: 20, max: 24 }
    },
    colorScheme: {
      cold: '#0066ff',
      optimal: '#00ff00',
      warm: '#ffaa00',
      hot: '#ff0000',
      noData: '#666666'
    },
    opacity: 0.7
  };

  initialize(fragments: FRAGS.FragmentsModels): void {
    this.fragments = fragments;
    console.log('🔥 Simple HeatMap System inicializado');
  }

  async activate(): Promise<void> {
    if (!this.fragments || this.isActive) return;
    
    console.log('🌡️ Activando simple heatmap...');
    this.isActive = true;
    await this.updateVisualization();
    console.log('✅ Simple heatmap activado');
  }

  async deactivate(): Promise<void> {
    if (!this.isActive) return;
    
    console.log('🌡️ Desactivando simple heatmap...');
    this.isActive = false;
    await this.clearAllHighlights();
    console.log('✅ Simple heatmap desactivado');
  }

  updateHeatMapData(data: HeatMapData[]): void {
    this.heatMapData.clear();
    data.forEach(item => {
      this.heatMapData.set(item.spaceGuid, item);
    });
    
    if (this.isActive) {
      this.updateVisualization();
    }
    
    console.log(`📊 Simple HeatMap datos actualizados: ${data.length} espacios`);
  }

  private getTemperatureColor(temperature: number): THREE.Color {
    const { min, max, optimal } = this.config.temperatureRange;
    const { cold, optimal: optimalColor, warm, hot } = this.config.colorScheme;
    
    if (temperature < min) {
      return new THREE.Color(cold);
    } else if (temperature > max) {
      return new THREE.Color(hot);
    } else if (temperature >= optimal.min && temperature <= optimal.max) {
      return new THREE.Color(optimalColor);
    } else if (temperature < optimal.min) {
      const factor = (temperature - min) / (optimal.min - min);
      return new THREE.Color(cold).lerp(new THREE.Color(optimalColor), factor);
    } else {
      const factor = (temperature - optimal.max) / (max - optimal.max);
      return new THREE.Color(optimalColor).lerp(new THREE.Color(hot), factor);
    }
  }

  private createHeatMapMaterial(temperature?: number): HighlightMaterial {
    let color: THREE.Color;
    let opacity = this.config.opacity;

    if (temperature !== undefined) {
      color = this.getTemperatureColor(temperature);
    } else {
      color = new THREE.Color(this.config.colorScheme.noData);
      opacity = this.config.opacity * 0.3;
    }

    return {
      color: color,
      renderedFaces: FRAGS.RenderedFaces.TWO,
      opacity: opacity,
      transparent: true
    };
  }

  private async updateVisualization(): Promise<void> {
    if (!this.fragments || !this.isActive) return;
    
    console.log('🎨 Actualizando visualización simple...');
    await this.clearAllHighlights();
    
    // Procesar cada modelo
    for (const model of this.fragments.list.values()) {
      try {
        await this.processModel(model);
      } catch (error) {
        console.warn(`Error procesando modelo ${model.id}:`, error);
      }
    }
  }

  private async processModel(model: FRAGS.FragmentsModel): Promise<void> {
    try {
      const categories = await model.getCategories();
      if (!categories.includes('IFCSPACE')) {
        return;
      }
      
      const spaces = await model.getItemsOfCategory('IFCSPACE');
      console.log(`Procesando ${spaces.length} espacios en modelo ${model.modelId}`);
      
      for (const space of spaces) {
        try {
          const localId = await space.getLocalId();
          if (localId === null) continue;
          
          const guid = await space.getGuid();
          if (!guid) continue;
          
          const heatData = this.heatMapData.get(guid);
          const material = this.createHeatMapMaterial(heatData?.temperature);
          
          // Usar tu función de highlight existente
          await highlightMultipleElements(model, [localId], material);
          
          // Guardar para cleanup
          this.highlightedSpaces.set(`${model.modelId}_${guid}`, {
            model,
            localIds: [localId]
          });
          
          if (heatData) {
            console.log(`🌡️ Espacio ${heatData.spaceName}: ${heatData.temperature.toFixed(1)}°C`);
          }
          
        } catch (spaceError) {
          console.warn('Error procesando espacio:', spaceError);
        }
      }
      
    } catch (error) {
      console.warn(`Error en processModel:`, error);
    }
  }

  private async clearAllHighlights(): Promise<void> {
    for (const [key, info] of this.highlightedSpaces.entries()) {
      try {
        await resetMultipleHighlights(info.model, info.localIds);
      } catch (error) {
        console.warn(`Error limpiando highlight ${key}:`, error);
      }
    }
    this.highlightedSpaces.clear();
  }

  // Getters públicos
  get isActiveMap(): boolean {
    return this.isActive;
  }

  get hasData(): boolean {
    return this.heatMapData.size > 0;
  }

  get dataCount(): number {
    return this.heatMapData.size;
  }

  getCurrentData(): HeatMapData[] {
    return Array.from(this.heatMapData.values());
  }

  getSpaceTemperature(spaceGuid: string): number | null {
    const data = this.heatMapData.get(spaceGuid);
    return data?.temperature || null;
  }

  configure(newConfig: Partial<SimpleHeatMapConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.isActive) {
      this.updateVisualization();
    }
  }
}

// Exportar instancia singleton
export const simpleHeatMap = new SimpleHeatMapSystem();

// Utilidades de testing para el sistema simple
export class SimpleHeatMapTestUtils {
  static generateTestData(spaces: any[]): HeatMapData[] {
    return spaces.slice(0, Math.min(spaces.length, 5)).map((space, index) => ({
      spaceGuid: space.properties?.globalId || `test-guid-${index}`,
      spaceName: space.name || `Espacio ${index + 1}`,
      temperature: 18 + Math.random() * 12, // 18-30°C
      timestamp: new Date().toISOString(),
      quality: Math.random() > 0.8 ? 'warning' : 'good' as any
    }));
  }

  static async quickTest(spaces: any[], fragments: FRAGS.FragmentsModels): Promise<void> {
    console.log('🚀 === SIMPLE HEATMAP QUICK TEST ===');
    
    try {
      if (spaces.length === 0) {
        throw new Error('No hay espacios disponibles');
      }

      console.log(`✓ ${spaces.length} espacios disponibles`);
      
      // Inicializar
      simpleHeatMap.initialize(fragments);
      
      // Generar datos de prueba
      const testData = this.generateTestData(spaces);
      console.log('🎲 Datos de prueba generados:', testData);
      
      // Aplicar datos
      simpleHeatMap.updateHeatMapData(testData);
      
      // Activar
      await simpleHeatMap.activate();
      
      console.log('✅ Simple heatmap test completado');
      console.log(`📊 Estado: Activo=${simpleHeatMap.isActiveMap}, Datos=${simpleHeatMap.dataCount}`);
      
    } catch (error) {
      console.error('❌ Error en simple test:', error);
      throw error;
    }
  }

  static async stopTest(): Promise<void> {
    console.log('⏹️ Deteniendo simple heatmap test...');
    await simpleHeatMap.deactivate();
    console.log('✅ Test detenido');
  }
}

// Exponer globalmente para testing
if (typeof window !== 'undefined') {
  (window as any).simpleHeatMapTest = SimpleHeatMapTestUtils;
  (window as any).simpleHeatMap = simpleHeatMap;
}

export default simpleHeatMap;