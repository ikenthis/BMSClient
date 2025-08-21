// HeatMapVisualization.ts - CORREGIDO: Sin auto-generación de colores Y SIN ETIQUETAS
"use client";

import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';

export interface HeatMapData {
  spaceGuid: string;
  spaceName: string;
  temperature: number;
  humidity?: number;
  occupancy?: number;
  airQuality?: number;
  timestamp: string;
  quality: 'good' | 'warning' | 'critical' | 'error';
}

export interface HeatMapVisualizationConfig {
  temperatureRange: {
    min: number;      
    max: number;      
    optimal: {
      min: number;    
      max: number;    
    };
  };
  colorScheme: {
    cold: string;     
    cool: string;     
    optimal: string;  
    warm: string;     
    hot: string;      
    noData: string;   
  };
  opacity: number;
  updateInterval: number;
  animateTransitions: boolean;
  isolateSpaces: boolean;
}

// 🔥 TODAS las categorías IFC - completa
const IFC_CATEGORIES = [
  "IFCWALL", "IFCSLAB", "IFCBEAM", "IFCCOLUMN", "IFCDOOR", "IFCWINDOW", 
  "IFCROOF", "IFCSTAIR", "IFCRAILING", "IFCFURNISHINGELEMENT", "IFCCURTAINWALL",
  "IFCPLATE", "IFCMEMBER", "IFCBUILDINGELEMENTPROXY", "IFCFLOWFITTING", 
  "IFCFLOWSEGMENT", "IFCFLOWTERMINAL", "IFCBUILDING", "IFCSPACE", "IFCSITE",
  "IFCPROJECT", "IFCBUILDINGSTOREY", "IFCFOOTING", "IFCPILE", "IFCCOVERING", "IFCSENSOR", "IFCSTAIRFLIGHT", 
  "IFGRID", "IFCMATERIAL","IFCMATERIAL", "IFCMATERIALLAYER", "IFCMPROPERTYSET", "IFCWALLSTANDARDCASE",
];

class HeatMapVisualizationService {
  private world: OBC.World | null = null;
  private fragments: FRAGS.FragmentsModels | null = null;
  private isActive: boolean = false;
  private heatMapData: Map<string, HeatMapData> = new Map();
  private activeSpaceHighlights: Map<string, { model: FRAGS.FragmentsModel; localIds: number[] }> = new Map();
  private updateTimer: number | null = null;

  // ⭐ MAPAS DE CORRESPONDENCIA
  private guidToLocalIdMap: Map<string, { model: FRAGS.FragmentsModel; localId: number }> = new Map();
  
  // 🔥 NUEVO: Mapa de centros de espacios
  private spaceCentersMap: Map<string, THREE.Vector3> = new Map();

  // 🔥 Para gestión de visibilidad
  private hiddenElements: Map<string, { model: FRAGS.FragmentsModel; localIds: number[]; category: string }> = new Map();
  private spaceElements: Map<string, { model: FRAGS.FragmentsModel; localIds: number[] }> = new Map();

  // 🔥 BATCH PROCESSING - MODIFICADO: Solo almacenar datos, no procesar automáticamente
  private pendingData: HeatMapData[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private config: HeatMapVisualizationConfig = {
    temperatureRange: {
      min: 15,    
      max: 32,    
      optimal: {
        min: 20,  
        max: 24,  
      }
    },
    colorScheme: {
      cold: '#0066ff',     
      cool: '#00aaff',     
      optimal: '#00ff00',  
      warm: '#ffaa00',     
      hot: '#ff0000',      
      noData: '#666666'    
    },
    opacity: 0.8,
    updateInterval: 5000,
    animateTransitions: true,
    isolateSpaces: true
  };

  /**
   * ⭐ INICIALIZACIÓN MEJORADA
   */
  async initialize(world: OBC.World, fragments: FRAGS.FragmentsModels): Promise<void> {
    console.log('🔥 === INICIALIZANDO HEATMAP VISUALIZATION ===');
    this.world = world;
    this.fragments = fragments;
    
    // Construir mapas de correspondencia SOLAMENTE - NO aplicar visualización
    await this.buildGuidToLocalIdMap();
    await this.buildElementMaps();
    await this.buildSpaceCentersMap();
    
    console.log('✅ HeatMapVisualization inicializado - ESPERANDO ACTIVACIÓN MANUAL');
  }

  /**
 * 🔥 FUNCIÓN SIMPLE: Obtener solo habitaciones (sin áreas)
 */
private async getFilteredSpaces(model: FRAGS.FragmentsModel): Promise<{ localId: number; guid: string; name: string }[]> {
  const categories = await model.getCategories();
  if (!categories.includes('IFCSPACE')) return [];
  
  const allSpaces = await model.getItemsOfCategory('IFCSPACE');
  const filteredSpaces: { localId: number; guid: string; name: string }[] = [];
  
  for (const space of allSpaces) {
    try {
      const localId = await space.getLocalId();
      if (localId === null) continue;
      
      const guid = await space.getGuid();
      if (!guid) continue;
      
      // Obtener propiedades para verificar el nombre
      const itemsData = await model.getItemsData([localId], {
        includeGeometry: false,
        includeMaterials: false,
        includeProperties: true
      });
      
      if (itemsData && itemsData.length > 0) {
        const name = this.extractPropertyValue(itemsData[0], 'Name') || '';
        
        // FILTRO SIMPLE: Si empieza con "Área:", saltarlo
        if (name.startsWith('Área:')) {
          console.log(`🚫 Excluido área: ${name}`);
          continue;
        }
        
        console.log(`✅ Incluida habitación: ${name}`);
        filteredSpaces.push({ localId, guid, name });
      }
    } catch (error) {
      console.warn('⚠️ Error filtrando espacio:', error);
    }
  }
  
  return filteredSpaces;
}

  /**
 * Función auxiliar para extraer propiedades IFC
 */
private extractPropertyValue(data: any, propertyName: string): string {
  if (!data) return '';
  
  if (data[propertyName] !== undefined) {
    const prop = data[propertyName];
    if (typeof prop === 'object' && prop && prop.type === 'IFCLABEL' && prop.value !== undefined) {
      return prop.value;
    }
    if (typeof prop !== 'object' || prop === null) {
      return String(prop);
    }
  }
  
  if (data.properties && data.properties[propertyName] !== undefined) {
    const prop = data.properties[propertyName];
    if (typeof prop === 'object' && prop && prop.value !== undefined) {
      return typeof prop.value === 'string' ? prop.value : String(prop.value);
    }
    if (typeof prop !== 'object' || prop === null) {
      return String(prop);
    }
  }
  
  return '';
}

/**
 * ⭐ CONSTRUIR MAPA GUID → LocalID CON FILTRO DE HABITACIONES
 */
private async buildGuidToLocalIdMap(): Promise<void> {
  if (!this.fragments) return;
  
  console.log('🗺️ Construyendo mapa GUID → LocalID (solo habitaciones)...');
  this.guidToLocalIdMap.clear();
  let totalSpaces = 0;
  let totalRooms = 0;
  let excludedAreas = 0;
  
  for (const model of this.fragments.models.list.values()) {
    try {
      const categories = await model.getCategories();
      if (!categories.includes('IFCSPACE')) continue;
      
      const spaces = await model.getItemsOfCategory('IFCSPACE');
      console.log(`🏠 Analizando ${spaces.length} espacios en modelo ${model.modelId}`);
      totalSpaces += spaces.length;
      
      for (const space of spaces) {
        try {
          const localId = await space.getLocalId();
          if (localId === null) continue;
          
          const guid = await space.getGuid();
          if (!guid) continue;
          
          // FILTRO: Obtener propiedades para verificar si es un área
          const itemsData = await model.getItemsData([localId], {
            includeGeometry: false,
            includeMaterials: false,
            includeProperties: true
          });
          
          if (itemsData && itemsData.length > 0) {
            const data = itemsData[0];
            // Extraer nombre y verificar filtro
            const name = this.extractPropertyValue(data, 'Name') || '';
            
            // FILTRO: Excluir áreas que empiecen con "Área:"
            if (name.startsWith('Área:')) {
              console.log(`🚫 Excluido área del HeatMap: ${name} (ID: ${localId})`);
              excludedAreas++;
              continue; // Saltar este elemento
            }
            
            // Si llegamos aquí, es una habitación - incluirla
            console.log(`✅ Incluida habitación: ${name} (ID: ${localId})`);
            totalRooms++;
          }
          
          this.guidToLocalIdMap.set(guid, { model, localId });
          
        } catch (spaceError) {
          console.warn('⚠️ Error procesando espacio:', spaceError);
        }
      }
    } catch (modelError) {
      console.warn(`⚠️ Error procesando modelo ${model.modelId}:`, modelError);
    }
  }
  
  console.log(`✅ === MAPA GUID→LocalID CONSTRUIDO CON FILTRO ===`);
  console.log(`🏠 Total espacios encontrados: ${totalSpaces}`);
  console.log(`✅ Habitaciones incluidas: ${totalRooms}`);
  console.log(`🚫 Áreas excluidas: ${excludedAreas}`);
  console.log(`🗺️ Espacios mapeados finales: ${this.guidToLocalIdMap.size}`);
}

  /**
   * 🔥 NUEVO: Construir mapa de centros de espacios
   */
  private async buildSpaceCentersMap(): Promise<void> {
    if (!this.fragments) return;
    
    console.log('📍 === CONSTRUYENDO MAPA DE CENTROS DE ESPACIOS ===');
    this.spaceCentersMap.clear();
    
    for (const model of this.fragments.models.list.values()) {
      try {
        const categories = await model.getCategories();
        if (!categories.includes('IFCSPACE')) continue;
        
        const spaces = await model.getItemsOfCategory('IFCSPACE');
        
        for (const space of spaces) {
          try {
            const guid = await space.getGuid();
            if (!guid) continue;
            
            const localId = await space.getLocalId();
            if (localId === null) continue;
            
            // 🔥 CALCULAR CENTRO DEL ESPACIO
            const center = await this.calculateSpaceCenter(model, localId);
            if (center) {
              this.spaceCentersMap.set(guid, center);
              console.log(`📍 Centro calculado para espacio ${guid.slice(-8)}: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
            }
            
          } catch (error) {
            console.warn('⚠️ Error calculando centro del espacio:', error);
          }
        }
        
      } catch (error) {
        console.warn(`⚠️ Error procesando centros del modelo ${model.modelId}:`, error);
      }
    }
    
    console.log(`✅ Centros de espacios calculados: ${this.spaceCentersMap.size}`);
  }

  /**
   * 🔥 NUEVO: Calcular centro geométrico de un espacio
   */
  private async calculateSpaceCenter(model: FRAGS.FragmentsModel, localId: number): Promise<THREE.Vector3 | null> {
    try {
      // Obtener la geometría del espacio
      const geometryInfo = await model.getGeometry(localId);
      if (!geometryInfo) return null;
      
      // Calcular bounding box
      const box = new THREE.Box3();
      
      // Si es una geometría de BufferGeometry
      if (geometryInfo.geometry && geometryInfo.geometry.attributes && geometryInfo.geometry.attributes.position) {
        const positions = geometryInfo.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
          const point = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
          
          // Aplicar transformación si existe
          if (geometryInfo.transform) {
            point.applyMatrix4(geometryInfo.transform);
          }
          
          box.expandByPoint(point);
        }
      }
      
      // Si no se pudo calcular el bounding box, usar método alternativo
      if (box.isEmpty()) {
        return await this.calculateSpaceCenterAlternative(model, localId);
      }
      
      // Calcular centro
      const center = new THREE.Vector3();
      box.getCenter(center);
      
      return center;
      
    } catch (error) {
      console.warn(`⚠️ Error calculando centro para LocalID ${localId}:`, error);
      return await this.calculateSpaceCenterAlternative(model, localId);
    }
  }

  /**
   * 🔥 NUEVO: Método alternativo para calcular centro de espacio
   */
  private async calculateSpaceCenterAlternative(model: FRAGS.FragmentsModel, localId: number): Promise<THREE.Vector3 | null> {
    try {
      // Usar información de las propiedades IFC si está disponible
      const properties = await model.getAllPropertiesOfItem(localId);
      
      // Buscar propiedades de ubicación o geometría
      if (properties && properties.GlobalId) {
        // Si no hay propiedades específicas, usar un centro por defecto
        // basado en el modelo o fragmento
        const modelBounds = model.boundingBox;
        if (modelBounds) {
          const center = new THREE.Vector3();
          modelBounds.getCenter(center);
          // Elevar un poco el centro para las etiquetas
          center.y += 2;
          return center;
        }
      }
      
      // Último recurso: origen con pequeño offset
      return new THREE.Vector3(0, 3, 0);
      
    } catch (error) {
      console.warn(`⚠️ Error en método alternativo de centro:`, error);
      return new THREE.Vector3(0, 3, 0);
    }
  }

  /**
   * 🔥 MEJORADO: Construir mapas de elementos por categoría con mejor logging
   */
  private async buildElementMaps(): Promise<void> {
    if (!this.fragments) return;
    
    console.log('🗺️ === CONSTRUYENDO MAPAS DE ELEMENTOS MEJORADOS ===');
    this.spaceElements.clear();
    
    let totalSpacesMapped = 0;
    
    for (const model of this.fragments.models.list.values()) {
      try {
        console.log(`🏗️ Analizando modelo: ${model.modelId}`);
        const categories = await model.getCategories();
        console.log(`📋 Categorías disponibles: ${categories.join(', ')}`);
        
        // Mapear espacios específicamente
        if (categories.includes('IFCSPACE')) {
          const spaceItems = await model.getItemsOfCategory('IFCSPACE');
          console.log(`🏠 Encontrados ${spaceItems.length} espacios en modelo ${model.modelId}`);
          
          const spaceLocalIds = (await Promise.all(
            spaceItems.map(async (item, index) => {
              try {
                const localId = await item.getLocalId();
                if (localId === null) {
                  console.warn(`⚠️ Espacio ${index} sin LocalID válido`);
                }
                return localId;
              } catch (error) {
                console.warn(`⚠️ Error obteniendo LocalID del espacio ${index}:`, error);
                return null;
              }
            })
          )).filter(id => id !== null) as number[];
          
          if (spaceLocalIds.length > 0) {
            this.spaceElements.set(model.modelId, {
              model,
              localIds: spaceLocalIds
            });
            totalSpacesMapped += spaceLocalIds.length;
            console.log(`✅ Modelo ${model.modelId}: ${spaceLocalIds.length} espacios mapeados correctamente`);
          } else {
            console.warn(`⚠️ Modelo ${model.modelId}: No se pudieron mapear espacios (LocalIDs inválidos)`);
          }
        } else {
          console.log(`ℹ️ Modelo ${model.modelId}: No contiene espacios (IFCSPACE)`);
        }
        
      } catch (error) {
        console.error(`❌ Error crítico mapeando modelo ${model.modelId}:`, error);
      }
    }
    
    console.log(`✅ === MAPAS DE ELEMENTOS CONSTRUIDOS ===`);
    console.log(`🏗️ Modelos procesados: ${this.fragments.models.list.size}`);
    console.log(`🏠 Modelos con espacios: ${this.spaceElements.size}`);
    console.log(`📊 Total espacios mapeados: ${totalSpacesMapped}`);
  }

  /**
   * 🔥 MEJORADO: Aislar espacios ocultando TODAS las categorías IFC excepto IFCSPACE
   */
  private async isolateSpaces(): Promise<void> {
  if (!this.fragments || !this.config.isolateSpaces) return;
  
  console.log('🔒 === AISLANDO SOLO HABITACIONES ===');
  this.hiddenElements.clear();
  
  const categoriesToHide = IFC_CATEGORIES.filter(cat => cat !== 'IFCSPACE');
  let totalHiddenElements = 0;
  
  for (const model of this.fragments.models.list.values()) {
    try {
      console.log(`🏗️ Procesando modelo: ${model.modelId}`);
      const availableCategories = await model.getCategories();
      
      // 1. Ocultar todas las categorías excepto IFCSPACE
      for (const category of availableCategories) {
        if (categoriesToHide.includes(category)) {
          try {
            const items = await model.getItemsOfCategory(category);
            const localIds = (await Promise.all(
              items.map(item => item.getLocalId())
            )).filter(id => id !== null) as number[];
            
            if (localIds.length > 0) {
              await model.setVisible(localIds, false);
              
              const key = `${model.modelId}_${category}`;
              this.hiddenElements.set(key, {
                model,
                localIds,
                category
              });
              
              totalHiddenElements += localIds.length;
              console.log(`🫥 Ocultados ${localIds.length} elementos de ${category}`);
            }
          } catch (categoryError) {
            console.warn(`⚠️ Error procesando categoría ${category}:`, categoryError);
          }
        }
      }
      
      // 2. Para IFCSPACE: Mostrar solo habitaciones, ocultar áreas
      if (availableCategories.includes('IFCSPACE')) {
        try {
          // Obtener TODOS los espacios primero
          const allSpaces = await model.getItemsOfCategory('IFCSPACE');
          const allSpaceIds = (await Promise.all(
            allSpaces.map(item => item.getLocalId())
          )).filter(id => id !== null) as number[];
          
          // Ocultar TODOS los espacios primero
          if (allSpaceIds.length > 0) {
            await model.setVisible(allSpaceIds, false);
          }
          
          // Luego mostrar SOLO las habitaciones filtradas
          const filteredSpaces = await this.getFilteredSpaces(model);
          const roomIds = filteredSpaces.map(space => space.localId);
          
          if (roomIds.length > 0) {
            await model.setVisible(roomIds, true);
            console.log(`👁️ Mostradas ${roomIds.length} habitaciones en modelo ${model.modelId}`);
          }
          
          console.log(`🏠 Total espacios: ${allSpaceIds.length}, Habitaciones mostradas: ${roomIds.length}, Áreas ocultas: ${allSpaceIds.length - roomIds.length}`);
          
        } catch (spaceError) {
          console.warn(`⚠️ Error procesando espacios:`, spaceError);
        }
      }
      
    } catch (modelError) {
      console.warn(`⚠️ Error procesando modelo ${model.modelId}:`, modelError);
    }
  }
  
  await this.fragments.update(true);
  
  console.log(`✅ === AISLAMIENTO COMPLETADO ===`);
  console.log(`🫥 Total elementos ocultos: ${totalHiddenElements}`);
  console.log(`🏠 Solo habitaciones visibles (áreas ocultas)`);
}

  /**
   * 🔥 NUEVO: Restaurar visibilidad de elementos ocultos
   */
  private async restoreElementsVisibility(): Promise<void> {
    if (!this.fragments || this.hiddenElements.size === 0) return;
    
    console.log('🔓 === RESTAURANDO VISIBILIDAD DE ELEMENTOS ===');
    
    for (const [key, elementInfo] of this.hiddenElements.entries()) {
      try {
        await elementInfo.model.setVisible(elementInfo.localIds, true);
        console.log(`👁️ Restaurados ${elementInfo.localIds.length} elementos de ${elementInfo.category}`);
      } catch (error) {
        console.warn(`⚠️ Error restaurando visibilidad de ${key}:`, error);
      }
    }
    
    this.hiddenElements.clear();
    await this.fragments.update(true);
    
    console.log('✅ Visibilidad de elementos restaurada');
  }

  /**
   * 🔥 NUEVO: Ocultar espacios específicamente al desactivar el mapa de calor
   */
  private async hideSpacesOnDeactivation(): Promise<void> {
    if (!this.fragments) return;
    
    console.log('🫥 === OCULTANDO ESPACIOS AL DESACTIVAR MAPA DE CALOR ===');
    
    let totalSpacesHidden = 0;
    
    for (const model of this.fragments.models.list.values()) {
      try {
        const categories = await model.getCategories();
        if (!categories.includes('IFCSPACE')) continue;
        
        const spaceItems = await model.getItemsOfCategory('IFCSPACE');
        
        if (spaceItems.length === 0) {
          console.log(`⚠️ No hay espacios en modelo ${model.modelId}`);
          continue;
        }
        
        const spaceLocalIds = (await Promise.all(
          spaceItems.map(item => item.getLocalId())
        )).filter(id => id !== null) as number[];
        
        if (spaceLocalIds.length > 0) {
          // Ocultar espacios
          await model.setVisible(spaceLocalIds, false);
          totalSpacesHidden += spaceLocalIds.length;
          console.log(`🫥 Ocultados ${spaceLocalIds.length} espacios en modelo ${model.modelId}`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error ocultando espacios en modelo ${model.modelId}:`, error);
      }
    }
    
    // Forzar actualización de la visualización
    await this.fragments.update(true);
    
    console.log(`✅ === ESPACIOS OCULTOS AL DESACTIVAR ===`);
    console.log(`🫥 Total espacios ocultos: ${totalSpacesHidden}`);
    console.log(`👁️ Todas las demás categorías permanecen visibles`);
  }

  /**
   * ❌ CORREGIDO: SOLO almacenar datos, NO procesarlos automáticamente
   */
  updateHeatMapData(data: HeatMapData[]): void {
    console.log(`📊 === ALMACENANDO DATOS (SIN PROCESAR): ${data.length} espacios ===`);
    
    // SOLO ALMACENAR - No procesar automáticamente
    this.pendingData.push(...data);
    
    // Limpiar duplicados
    const uniqueData = this.pendingData.reduce((acc, current) => {
      const existing = acc.find(item => item.spaceGuid === current.spaceGuid);
      if (!existing) {
        acc.push(current);
      } else {
        const currentTime = new Date(current.timestamp).getTime();
        const existingTime = new Date(existing.timestamp).getTime();
        if (currentTime > existingTime) {
          const index = acc.indexOf(existing);
          acc[index] = current;
        }
      }
      return acc;
    }, [] as HeatMapData[]);
    
    this.pendingData = uniqueData;
    
    // Actualizar almacenamiento interno
    this.heatMapData.clear();
    uniqueData.forEach(item => {
      this.heatMapData.set(item.spaceGuid, item);
    });
    
    console.log(`📦 Datos almacenados. Total disponible: ${this.pendingData.length}`);
    console.log(`⚠️ MAPA DE CALOR NO ACTIVADO - Use el botón del panel para activar`);
    
    // Disparar evento de datos actualizados
    window.dispatchEvent(new CustomEvent('heatMapDataUpdated', { 
      detail: { data: uniqueData } 
    }));
  }

  /**
   * 🔥 MODIFICADO: Solo procesar cuando se llame explícitamente
   */
  private async processBatchData(): Promise<void> {
    if (this.isProcessing || this.pendingData.length === 0) return;
    
    // ❌ VERIFICAR QUE EL MAPA ESTÉ ACTIVO
    if (!this.isActive) {
      console.log(`⚠️ === DATOS LISTOS PERO MAPA INACTIVO ===`);
      console.log(`📊 ${this.pendingData.length} espacios con datos esperando activación`);
      console.log(`🎛️ Use el botón 'Activar Mapa de Calor' en el panel de control`);
      return;
    }
    
    this.isProcessing = true;
    console.log(`🎯 === PROCESANDO BATCH DE ${this.pendingData.length} ESPACIOS ===`);
    
    try {
      const uniqueData = [...this.pendingData]; // Ya están limpios desde updateHeatMapData
      
      console.log(`🧹 Procesando ${uniqueData.length} espacios únicos`);
      
      // 🔥 APLICAR COLORES SOLO SI ESTÁ ACTIVO
      await this.applyColorsWithImprovedRange(uniqueData);
      
      console.log(`✅ === BATCH PROCESADO EXITOSAMENTE: ${uniqueData.length} espacios ===`);
      
    } catch (error) {
      console.error('❌ Error procesando batch de HeatMap:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 🔥 CORREGIDO: Aplicar colores con rango de temperatura corregido
   */
  private async applyColorsWithImprovedRange(heatMapData: HeatMapData[]): Promise<void> {
  if (!this.fragments || heatMapData.length === 0 || !this.isActive) {
    console.log('⚠️ No aplicando colores - HeatMap inactivo o sin datos');
    return;
  }
  
  console.log(`🎨 === APLICANDO COLORES SOLO A HABITACIONES ===`);
  
  await this.clearAllHighlights();
  
  let spacesColored = 0;
  
  for (const model of this.fragments.models.list.values()) {
    try {
      // 🔥 USAR FUNCIÓN FILTRADA en lugar de getItemsOfCategory
      const filteredSpaces = await this.getFilteredSpaces(model);
      
      console.log(`🎯 Procesando ${filteredSpaces.length} habitaciones en modelo ${model.modelId}`);
      
      for (const space of filteredSpaces) {
        try {
          const sensorData = heatMapData.find(data => 
            data.spaceGuid === space.guid ||
            data.spaceGuid.includes(space.guid.substring(0, 8)) ||
            space.guid.includes(data.spaceGuid.substring(0, 8))
          );
          
          if (sensorData) {
            console.log(`🎯 Coloreando habitación: ${space.name} (${sensorData.temperature.toFixed(1)}°C)`);
            
            const color = this.getTemperatureColorCorrected(sensorData.temperature);
            
            await model.highlight([space.localId], {
              color: color,
              opacity: this.config.opacity,
              renderedFaces: FRAGS.RenderedFaces.TWO,
              transparent: true
            });
            
            this.activeSpaceHighlights.set(space.guid, {
              model,
              localIds: [space.localId]
            });
            
            spacesColored++;
          }
          
        } catch (spaceError) {
          console.warn(`⚠️ Error procesando habitación:`, spaceError);
        }
      }
      
    } catch (modelError) {
      console.warn(`⚠️ Error procesando modelo ${model.modelId}:`, modelError);
    }
  }
  
  console.log('🔄 === ACTUALIZANDO VISUALIZACIÓN ===');
  await this.fragments.update(true);
  
  console.log(`✅ === HEATMAP APLICADO SOLO A HABITACIONES ===`);
  console.log(`🎨 Habitaciones coloreadas: ${spacesColored}`);
  console.log(`📊 Total datos recibidos: ${heatMapData.length}`);
}

  /**
   * 🔥 CORREGIDO: Sistema de colores de temperatura usando configuración
   */
  private getTemperatureColorCorrected(temperature: number): THREE.Color {
    const { min, max, optimal } = this.config.temperatureRange;
    
    console.log(`🎨 Calculando color para ${temperature}°C (rango: ${min}-${max}°C, óptimo: ${optimal.min}-${optimal.max}°C)`);
    
    // Normalizar temperatura en el rango configurado
    let normalizedTemp: number;
    
    if (temperature <= min) {
      normalizedTemp = 0; // Muy frío
    } else if (temperature >= max) {
      normalizedTemp = 1; // Muy caliente
    } else {
      normalizedTemp = (temperature - min) / (max - min);
    }
    
    console.log(`🔢 Temperatura normalizada: ${normalizedTemp.toFixed(3)}`);
    
    let color: THREE.Color;
    
    // Zona muy fría (por debajo del mínimo o en el primer rango)
    if (temperature < optimal.min && normalizedTemp < 0.3) {
      color = new THREE.Color(this.config.colorScheme.cold); // Azul frío
      console.log(`❄️ Zona fría: ${this.config.colorScheme.cold}`);
    }
    // Zona fresca (acercándose al óptimo desde abajo)
    else if (temperature < optimal.min) {
      color = new THREE.Color(this.config.colorScheme.cool); // Azul claro
      console.log(`🧊 Zona fresca: ${this.config.colorScheme.cool}`);
    }
    // Zona óptima (confort)
    else if (temperature >= optimal.min && temperature <= optimal.max) {
      color = new THREE.Color(this.config.colorScheme.optimal); // Verde
      console.log(`✅ Zona óptima: ${this.config.colorScheme.optimal}`);
    }
    // Zona cálida (por encima del óptimo pero no extrema)
    else if (temperature > optimal.max && normalizedTemp < 0.8) {
      color = new THREE.Color(this.config.colorScheme.warm); // Naranja
      console.log(`🔥 Zona cálida: ${this.config.colorScheme.warm}`);
    }
    // Zona muy caliente (extrema)
    else {
      color = new THREE.Color(this.config.colorScheme.hot); // Rojo
      console.log(`🌡️ Zona muy caliente: ${this.config.colorScheme.hot}`);
    }
    
    return color;
  }

  /**
   * 🔥 NUEVO: Verificar estado completo del aislamiento
   */
  public async verifyIsolationState(): Promise<void> {
    if (!this.fragments) {
      console.log('❌ No hay fragments inicializados');
      return;
    }
    
    console.log('🔍 === VERIFICANDO ESTADO DE AISLAMIENTO ===');
    
    for (const model of this.fragments.models.list.values()) {
      try {
        console.log(`\n🏗️ MODELO: ${model.modelId}`);
        const categories = await model.getCategories();
        
        for (const category of categories) {
          try {
            const items = await model.getItemsOfCategory(category);
            if (items.length === 0) continue;
            
            const localIds = (await Promise.all(
              items.map(item => item.getLocalId())
            )).filter(id => id !== null) as number[];
            
            if (localIds.length === 0) continue;
            
            // Verificar visibilidad del primer elemento como muestra
            const isVisible = await model.isVisible(localIds[0]);
            const statusIcon = isVisible ? '👁️' : '🫥';
            const expectedStatus = category === 'IFCSPACE' ? 'VISIBLE' : 'OCULTO';
            const actualStatus = isVisible ? 'VISIBLE' : 'OCULTO';
            const isCorrect = (category === 'IFCSPACE' && isVisible) || (category !== 'IFCSPACE' && !isVisible);
            const resultIcon = isCorrect ? '✅' : '❌';
            
            console.log(`  ${statusIcon} ${category}: ${localIds.length} elementos - ${actualStatus} (esperado: ${expectedStatus}) ${resultIcon}`);
            
          } catch (error) {
            console.warn(`  ⚠️ Error verificando ${category}:`, error);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error verificando modelo ${model.modelId}:`, error);
      }
    }
    
    console.log(`\n📊 RESUMEN DE AISLAMIENTO:`);
    console.log(`🔒 Aislamiento configurado: ${this.config.isolateSpaces ? 'SÍ' : 'NO'}`);
    console.log(`🌡️ HeatMap activo: ${this.isActive ? 'SÍ' : 'NO'}`);
    console.log(`🫥 Elementos ocultos: ${this.hiddenElements.size} categorías`);
    console.log(`🏠 Espacios mapeados: ${this.spaceElements.size} modelos`);
    console.log(`📍 Centros calculados: ${this.spaceCentersMap.size} espacios`);
  }

  /**
   * ✅ ACTIVAR CON AISLAMIENTO - SOLO SE EJECUTA MANUALMENTE
   */
  async activateHeatMap(): Promise<void> {
    if (!this.world || !this.fragments || this.isActive) {
      console.log('⚠️ Ya está activo o no está inicializado');
      return;
    }
    
    console.log('🌡️ === ACTIVANDO MAPA DE CALOR MANUALMENTE ===');
    this.isActive = true;
    
    // Reconstruir mapas por si acaso
    await this.buildGuidToLocalIdMap();
    await this.buildElementMaps();
    await this.buildSpaceCentersMap();
    
    // 🔥 AISLAR ESPACIOS SI ESTÁ CONFIGURADO
    if (this.config.isolateSpaces) {
      await this.isolateSpaces();
    }
    
    // ✅ PROCESAR DATOS PENDIENTES SI LOS HAY
    if (this.pendingData.length > 0) {
      console.log(`📊 Procesando ${this.pendingData.length} datos pendientes...`);
      await this.processBatchData();
    }
    
    this.startUpdateTimer();
    
    console.log('✅ === MAPA DE CALOR ACTIVADO EXITOSAMENTE ===');
    console.log(`🌡️ Estado: ACTIVO`);
    console.log(`📊 Datos disponibles: ${this.heatMapData.size}`);
    console.log(`🔒 Aislamiento: ${this.config.isolateSpaces ? 'ACTIVO' : 'INACTIVO'}`);
  }

  /**
   * ✅ DESACTIVAR CON RESTAURACIÓN Y OCULTAMIENTO DE ESPACIOS
   */
  async deactivateHeatMap(): Promise<void> {
    if (!this.isActive) {
      console.log('⚠️ HeatMap ya está desactivado');
      return;
    }
    
    console.log('🌡️ === DESACTIVANDO MAPA DE CALOR Y RESTAURANDO ===');
    this.isActive = false;
    
    this.stopUpdateTimer();
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    await this.clearAllHighlights();
    
    // 🔥 RESTAURAR VISIBILIDAD DE ELEMENTOS (excepto IFCSPACE)
    await this.restoreElementsVisibility();
    
    // 🔥 NUEVO: OCULTAR ESPECÍFICAMENTE LOS ESPACIOS (IFCSPACE)
    await this.hideSpacesOnDeactivation();
    
    console.log('✅ === MAPA DE CALOR DESACTIVADO, ELEMENTOS RESTAURADOS Y ESPACIOS OCULTOS ===');
    console.log(`🌡️ Estado: INACTIVO`);
    console.log(`📊 Datos conservados: ${this.heatMapData.size} (para próxima activación)`);
  }

  // === MÉTODOS PÚBLICOS CORREGIDOS ===

  /**
   * ✅ FORZAR PROCESAMIENTO MANUAL DE BATCH
   */
  async forceProcessBatch(): Promise<void> {
    if (!this.isActive) {
      console.log('⚠️ HeatMap debe estar activo para procesar datos');
      return;
    }
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.processBatchData();
  }

  /**
   * ✅ LIMPIAR HEATMAP MANUALMENTE
   */
  async clearHeatMap(): Promise<void> {
    if (!this.fragments) return;
    
    console.log('🧹 === LIMPIANDO HEATMAP ===');
    
    for (const model of this.fragments.models.list.values()) {
      try {
        const categories = await model.getCategories();
        if (!categories.includes('IFCSPACE')) continue;
        
        const spaceItems = await model.getItemsOfCategory('IFCSPACE');
        const localIds = (await Promise.all(
          spaceItems.map(item => item.getLocalId())
        )).filter(id => id !== null) as number[];
        
        if (localIds.length > 0) {
          await model.resetHighlight(localIds);
        }
      } catch (error) {
        console.warn(`⚠️ Error limpiando modelo ${model.modelId}:`, error);
      }
    }
    
    await this.fragments.update(true);
    this.heatMapData.clear();
    this.pendingData = [];
    this.activeSpaceHighlights.clear();
    
    console.log('✅ HeatMap limpiado');
  }

  private async clearAllHighlights(): Promise<void> {
    if (!this.fragments || this.activeSpaceHighlights.size === 0) return;
    
    console.log(`🧹 Limpiando ${this.activeSpaceHighlights.size} highlights activos...`);
    
    for (const [key, highlightInfo] of this.activeSpaceHighlights.entries()) {
      try {
        await highlightInfo.model.resetHighlight(highlightInfo.localIds);
      } catch (error) {
        console.warn(`⚠️ Error limpiando highlight ${key}:`, error);
      }
    }
    
    this.activeSpaceHighlights.clear();
  }

  /**
   * ❌ TIMER MODIFICADO: Solo actualiza si está activo
   */
  private startUpdateTimer(): void {
    if (this.updateTimer) return;
    
    this.updateTimer = window.setInterval(() => {
      if (this.isActive && this.heatMapData.size > 0) {
        console.log('🔄 Actualización automática del heatmap (solo si está activo)...');
        const currentData = Array.from(this.heatMapData.values());
        this.applyColorsWithImprovedRange(currentData);
      }
    }, this.config.updateInterval);
  }

  private stopUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  // === MÉTODOS DE CONFIGURACIÓN ACTUALIZADOS ===

  configure(newConfig: Partial<HeatMapVisualizationConfig>): void {
    const oldIsolateSpaces = this.config.isolateSpaces;
    this.config = { ...this.config, ...newConfig };
    
    // Solo aplicar cambios si está activo
    if (this.isActive && oldIsolateSpaces !== this.config.isolateSpaces) {
      if (this.config.isolateSpaces) {
        this.isolateSpaces();
      } else {
        this.restoreElementsVisibility();
      }
    }
    
    // Solo aplicar visualización si está activo
    if (this.isActive && this.heatMapData.size > 0) {
      const currentData = Array.from(this.heatMapData.values());
      this.applyColorsWithImprovedRange(currentData);
    }
    
    console.log('🔧 Configuración del heatmap actualizada:', newConfig);
  }

  public debugCorrespondences(): void {
    console.log('🔍 === DEBUG: HEATMAP CON CONTROL MANUAL ===');
    
    console.log('\n📋 ESTADO GENERAL:');
    console.log(`🌡️ HeatMap activo: ${this.isActive ? 'SÍ' : 'NO'}`);
    console.log(`🔒 Aislamiento configurado: ${this.config.isolateSpaces ? 'SÍ' : 'NO'}`);
    console.log(`📊 Datos almacenados: ${this.heatMapData.size}`);
    console.log(`📦 Datos pendientes: ${this.pendingData.length}`);
    console.log(`⚙️ Procesando: ${this.isProcessing ? 'SÍ' : 'NO'}`);
    
    console.log('\n📋 MAPA DE CORRESPONDENCIAS:');
    this.guidToLocalIdMap.forEach((mapping, guid) => {
      console.log(`${guid.slice(-8)}... → Model: ${mapping.model.modelId}, LocalID: ${mapping.localId}`);
    });
    
    console.log('\n📋 DATOS DE CALOR:');
    this.heatMapData.forEach((data, guid) => {
      const hasMapping = this.guidToLocalIdMap.has(guid);
      const hasCenter = this.spaceCentersMap.has(guid);
      console.log(`${guid.slice(-8)}... → ${data.spaceName} (${data.temperature}°C) [Mapping: ${hasMapping ? '✅' : '❌'}] [Centro: ${hasCenter ? '✅' : '❌'}]`);
    });
    
    console.log('\n📍 CENTROS DE ESPACIOS:');
    this.spaceCentersMap.forEach((center, guid) => {
      console.log(`${guid.slice(-8)}... → (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
    });
    
    console.log('\n🏠 ELEMENTOS DE ESPACIOS:');
    this.spaceElements.forEach((elements, modelId) => {
      console.log(`Modelo ${modelId}: ${elements.localIds.length} espacios`);
    });
    
    console.log('\n🫥 ELEMENTOS OCULTOS:');
    this.hiddenElements.forEach((elements, key) => {
      console.log(`${key}: ${elements.localIds.length} elementos de ${elements.category}`);
    });
    
    console.log('\n📊 ESTADÍSTICAS:');
    console.log(`🗺️ Correspondencias: ${this.guidToLocalIdMap.size}`);
    console.log(`🌡️ Datos de calor: ${this.heatMapData.size}`);
    console.log(`📍 Centros calculados: ${this.spaceCentersMap.size}`);
    console.log(`🎨 Highlights activos: ${this.activeSpaceHighlights.size}`);
    console.log(`📦 Datos pendientes: ${this.pendingData.length}`);
    console.log(`🔒 Elementos ocultos: ${this.hiddenElements.size}`);
    
    if (!this.isActive && this.heatMapData.size > 0) {
      console.log('\n⚠️ AVISO: Hay datos disponibles pero el HeatMap está INACTIVO');
      console.log('🎛️ Use activateHeatMap() para activar la visualización');
    }
  }

  public async rebuildCorrespondenceMap(): Promise<void> {
    console.log('🔄 Reconstruyendo mapas de correspondencia y centros...');
    await this.buildGuidToLocalIdMap();
    await this.buildElementMaps();
    await this.buildSpaceCentersMap();
    
    // Solo aplicar visualización si está activo
    if (this.isActive && this.heatMapData.size > 0) {
      const currentData = Array.from(this.heatMapData.values());
      await this.applyColorsWithImprovedRange(currentData);
    }
    console.log('✅ Mapas y centros reconstruidos');
  }

  // === MÉTODOS PÚBLICOS PARA CONTROL DE AISLAMIENTO ===

  /**
   * 🔥 TOGGLE AISLAMIENTO - Solo afecta si está activo
   */
  public async toggleSpaceIsolation(): Promise<void> {
    this.config.isolateSpaces = !this.config.isolateSpaces;
    
    if (this.isActive) {
      if (this.config.isolateSpaces) {
        await this.isolateSpaces();
      } else {
        await this.restoreElementsVisibility();
      }
    }
    
    console.log(`🔒 Aislamiento de espacios: ${this.config.isolateSpaces ? 'ACTIVADO' : 'DESACTIVADO'}`);
    if (!this.isActive) {
      console.log('ℹ️ Cambio se aplicará cuando se active el HeatMap');
    }
  }

  /**
   * 🔥 FORZAR AISLAMIENTO - Solo si está activo
   */
  public async forceIsolateSpaces(): Promise<void> {
    if (this.isActive) {
      await this.isolateSpaces();
    } else {
      console.log('⚠️ HeatMap debe estar activo para forzar aislamiento');
    }
  }

  /**
   * 🔥 FORZAR RESTAURACIÓN
   */
  public async forceRestoreElements(): Promise<void> {
    await this.restoreElementsVisibility();
  }

  /**
   * 🔥 NUEVO: Forzar ocultamiento de espacios (método público)
   */
  public async forceHideSpacesMethod(): Promise<void> {
    await this.hideSpacesOnDeactivation();
  }

  // === GETTERS Y UTILIDADES ACTUALIZADOS ===

  getCurrentData(): HeatMapData[] {
    return Array.from(this.heatMapData.values());
  }

  getSpaceData(spaceGuid: string): HeatMapData | null {
    return this.heatMapData.get(spaceGuid) || null;
  }

  getSpaceTemperature(spaceGuid: string): number | null {
    const data = this.heatMapData.get(spaceGuid);
    return data?.temperature || null;
  }

  dispose(): void {
    console.log('🧹 Disposing HeatMapVisualization...');
    
    this.deactivateHeatMap();
    
    this.heatMapData.clear();
    this.activeSpaceHighlights.clear();
    this.guidToLocalIdMap.clear();
    this.spaceCentersMap.clear();
    this.hiddenElements.clear();
    this.spaceElements.clear();
    this.pendingData = [];
    
    console.log('🔥 HeatMapVisualization disposed completamente');
  }

  // === GETTERS DE ESTADO ACTUALIZADOS ===

  get isActiveMap(): boolean {
    return this.isActive;
  }

  get hasData(): boolean {
    return this.heatMapData.size > 0;
  }

  get dataCount(): number {
    return this.heatMapData.size;
  }

  get isInitialized(): boolean {
    return this.world !== null && this.fragments !== null;
  }

  get correspondenceMapSize(): number {
    return this.guidToLocalIdMap.size;
  }

  get activeHighlightsCount(): number {
    return this.activeSpaceHighlights.size;
  }

  get pendingDataCount(): number {
    return this.pendingData.length;
  }

  get hiddenElementsCount(): number {
    return this.hiddenElements.size;
  }

  get isSpaceIsolationActive(): boolean {
    return this.config.isolateSpaces && this.isActive;
  }

  get spaceCentersCount(): number {
    return this.spaceCentersMap.size;
  }

  get hasSpaceCenters(): boolean {
    return this.spaceCentersMap.size > 0;
  }

  get isReadyForActivation(): boolean {
    return this.isInitialized && this.guidToLocalIdMap.size > 0 && !this.isActive;
  }

  get hasDataWaitingForActivation(): boolean {
    return !this.isActive && this.heatMapData.size > 0;
  }
}

// Exportar instancia singleton
export const heatMapVisualization = new HeatMapVisualizationService();

// ⭐ FUNCIONES DE DEBUG GLOBALES ACTUALIZADAS
(window as any).debugHeatMapCorrespondences = () => {
  if (heatMapVisualization.debugCorrespondences) {
    heatMapVisualization.debugCorrespondences();
  } else {
    console.error('❌ Función de debug no disponible');
  }
};

(window as any).rebuildHeatMapCorrespondences = async () => {
  if (heatMapVisualization.rebuildCorrespondenceMap) {
    await heatMapVisualization.rebuildCorrespondenceMap();
  } else {
    console.error('❌ Función de reconstrucción no disponible');
  }
};

(window as any).forceHeatMapBatch = async () => {
  if (heatMapVisualization.forceProcessBatch) {
    await heatMapVisualization.forceProcessBatch();
  } else {
    console.error('❌ Función de forzar batch no disponible');
  }
};

(window as any).toggleSpaceIsolation = async () => {
  if (heatMapVisualization.toggleSpaceIsolation) {
    await heatMapVisualization.toggleSpaceIsolation();
  } else {
    console.error('❌ Función de toggle aislamiento no disponible');
  }
};

(window as any).forceIsolateSpaces = async () => {
  if (heatMapVisualization.forceIsolateSpaces) {
    await heatMapVisualization.forceIsolateSpaces();
  } else {
    console.error('❌ Función de forzar aislamiento no disponible');
  }
};

(window as any).forceRestoreElements = async () => {
  if (heatMapVisualization.forceRestoreElements) {
    await heatMapVisualization.forceRestoreElements();
  } else {
    console.error('❌ Función de restaurar elementos no disponible');
  }
};

(window as any).verifyIsolationState = async () => {
  if (heatMapVisualization.verifyIsolationState) {
    await heatMapVisualization.verifyIsolationState();
  } else {
    console.error('❌ Función de verificación no disponible');
  }
};

// ✅ NUEVAS FUNCIONES DE CONTROL MANUAL
(window as any).activateHeatMap = async () => {
  await heatMapVisualization.activateHeatMap();
};

(window as any).deactivateHeatMap = async () => {
  await heatMapVisualization.deactivateHeatMap();
};

(window as any).checkHeatMapStatus = () => {
  console.log('🔍 === ESTADO DEL HEATMAP ===');
  console.log(`🌡️ Activo: ${heatMapVisualization.isActiveMap ? 'SÍ' : 'NO'}`);
  console.log(`📊 Datos: ${heatMapVisualization.dataCount}`);
  console.log(`📦 Pendientes: ${heatMapVisualization.pendingDataCount}`);
  console.log(`🔒 Aislamiento: ${heatMapVisualization.isSpaceIsolationActive ? 'ACTIVO' : 'INACTIVO'}`);
  console.log(`✅ Listo para activar: ${heatMapVisualization.isReadyForActivation ? 'SÍ' : 'NO'}`);
  console.log(`⏳ Datos esperando: ${heatMapVisualization.hasDataWaitingForActivation ? 'SÍ' : 'NO'}`);
};

// 🔥 NUEVA FUNCIÓN: Forzar ocultamiento de espacios
(window as any).forceHideSpaces = async () => {
  if (heatMapVisualization.forceHideSpacesMethod) {
    await heatMapVisualization.forceHideSpacesMethod();
  } else {
    console.error('❌ Función de forzar ocultamiento de espacios no disponible');
  }
};

export default heatMapVisualization;