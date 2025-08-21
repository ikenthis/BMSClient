// HeatMapHoverManager.ts - Gestor de eventos hover para el HeatMap
import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';

export interface HoverEventData {
  spaceGuid: string;
  spaceName: string;
  localId: number;
  model: FRAGS.FragmentsModel;
  mousePosition: { x: number; y: number };
  spaceCenter?: THREE.Vector3;
}

export interface SpaceSensorData {
  spaceGuid: string;
  spaceName: string;
  temperature?: number;
  humidity?: number;
  occupancy?: number;
  quality: 'good' | 'warning' | 'critical' | 'error';
  timestamp: string;
  sensors: Array<{
    sensorId: string;
    sensorName: string;
    type: 'temperature' | 'occupancy';
    value: number;
    unit: string;
    quality: 'good' | 'warning' | 'critical' | 'error';
    timestamp: string;
    additionalData?: any;
  }>;
}

class HeatMapHoverManager {
  private world: OBC.World | null = null;
  private fragments: FRAGS.FragmentsModels | null = null;
  private isActive: boolean = false;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private currentHoveredSpace: HoverEventData | null = null;
  private hoverTimeout: NodeJS.Timeout | null = null;
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };

  // Mapas de correspondencia (similares a HeatMapVisualization)
  private guidToLocalIdMap: Map<string, { model: FRAGS.FragmentsModel; localId: number }> = new Map();
  private spaceDataCache: Map<string, SpaceSensorData> = new Map();

  // Callbacks para eventos
  private onSpaceHoverCallback: ((data: HoverEventData) => void) | null = null;
  private onSpaceLeaveCallback: (() => void) | null = null;
  private onSpaceDataRequestCallback: ((spaceGuid: string) => Promise<SpaceSensorData | null>) | null = null;

  /**
   * Inicializa el gestor de hover
   */
  initialize(world: OBC.World, fragments: FRAGS.FragmentsModels): void {
    console.log('🖱️ Inicializando HeatMapHoverManager');
    this.world = world;
    this.fragments = fragments;
    
    this.buildGuidToLocalIdMap();
    this.setupEventListeners();
    
    console.log('✅ HeatMapHoverManager inicializado');
  }

  /**
   * Activa/desactiva el sistema de hover
   */
  setActive(active: boolean): void {
    console.log(`🖱️ ${active ? 'Activando' : 'Desactivando'} sistema de hover`);
    this.isActive = active;
    
    if (!active) {
      this.clearCurrentHover();
    }
  }

  /**
   * Construye el mapa de correspondencias GUID -> LocalID (filtrado para habitaciones)
   */
  private async buildGuidToLocalIdMap(): Promise<void> {
    if (!this.fragments) return;
    
    console.log('🗺️ Construyendo mapa GUID → LocalID para hover...');
    this.guidToLocalIdMap.clear();
    
    for (const model of this.fragments.models.list.values()) {
      try {
        const categories = await model.getCategories();
        if (!categories.includes('IFCSPACE')) continue;
        
        const spaces = await model.getItemsOfCategory('IFCSPACE');
        
        for (const space of spaces) {
          try {
            const localId = await space.getLocalId();
            if (localId === null) continue;
            
            const guid = await space.getGuid();
            if (!guid) continue;
            
            // Filtrar áreas (similar a HeatMapVisualization)
            const itemsData = await model.getItemsData([localId], {
              includeGeometry: false,
              includeMaterials: false,
              includeProperties: true
            });
            
            if (itemsData && itemsData.length > 0) {
              const name = this.extractPropertyValue(itemsData[0], 'Name') || '';
              
              // Excluir áreas que empiecen con "Área:"
              if (name.startsWith('Área:')) {
                continue;
              }
            }
            
            this.guidToLocalIdMap.set(guid, { model, localId });
            
          } catch (error) {
            console.warn('⚠️ Error procesando espacio para hover:', error);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error procesando modelo ${model.modelId}:`, error);
      }
    }
    
    console.log(`✅ Mapa de hover construido: ${this.guidToLocalIdMap.size} espacios`);
  }

  /**
   * Extrae valor de propiedad IFC
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
   * Configura los event listeners del mouse
   */
  private setupEventListeners(): void {
    if (!this.world || !this.world.renderer) return;
    
    const canvas = this.world.renderer.three.domElement;
    
    // Mouse move para raycasting
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    
    console.log('🖱️ Event listeners configurados');
  }

  /**
   * Maneja el movimiento del mouse
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isActive || !this.world || !this.fragments) return;

    // Actualizar posición del mouse
    this.mousePosition = { x: event.clientX, y: event.clientY };

    // Calcular coordenadas normalizadas
    const canvas = this.world.renderer!.three.domElement;
    const rect = canvas.getBoundingClientRect();
    
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Realizar raycasting
    this.performRaycast();
  }

  /**
   * Maneja cuando el mouse sale del canvas
   */
  private onMouseLeave(): void {
    this.clearCurrentHover();
  }

  /**
   * Realiza el raycasting para detectar espacios
   */
  private performRaycast(): void {
    if (!this.world || !this.fragments) return;

    // Configurar raycaster
    const camera = this.world.camera.three;
    this.raycaster.setFromCamera(this.mouse, camera);

    // Obtener todos los objetos de la escena
    const scene = this.world.scene.three;
    const intersects = this.raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      this.handleIntersection(intersects[0]);
    } else {
      this.clearCurrentHover();
    }
  }

  /**
   * Maneja una intersección detectada
   */
  private async handleIntersection(intersection: THREE.Intersection): Promise<void> {
    try {
      // Buscar el fragmento que contiene este objeto
      for (const model of this.fragments!.models.list.values()) {
        const fragmentMap = model.fragmentMap;
        
        for (const [fragmentId, fragment] of fragmentMap) {
          if (fragment.mesh === intersection.object || 
              intersection.object.parent === fragment.mesh) {
            
            // Obtener el localId del objeto intersectado
            const localId = this.getLocalIdFromIntersection(fragment, intersection);
            if (localId === null) continue;

            // Verificar si es un espacio (IFCSPACE)
            if (await this.isSpace(model, localId)) {
              await this.handleSpaceHover(model, localId, intersection.point);
              return;
            }
          }
        }
      }
      
      // Si no se encontró un espacio, limpiar hover
      this.clearCurrentHover();
      
    } catch (error) {
      console.warn('⚠️ Error en raycasting:', error);
      this.clearCurrentHover();
    }
  }

  /**
   * Obtiene el localId del objeto intersectado
   */
  private getLocalIdFromIntersection(fragment: FRAGS.Fragment, intersection: THREE.Intersection): number | null {
    try {
      // El localId puede estar en diferentes lugares según el tipo de fragmento
      const face = intersection.face;
      if (!face) return null;

      // Intentar obtener el localId del fragmento
      const geometry = intersection.object.geometry as THREE.BufferGeometry;
      if (geometry && geometry.attributes && geometry.attributes.blockID) {
        const blockIdArray = geometry.attributes.blockID.array;
        const faceIndex = face.a; // Usar el primer vértice de la cara
        if (faceIndex < blockIdArray.length) {
          return blockIdArray[faceIndex];
        }
      }

      // Método alternativo: usar índices del fragmento
      if (fragment.id) {
        return fragment.id;
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Error obteniendo localId:', error);
      return null;
    }
  }

  /**
   * Verifica si un elemento es un espacio (IFCSPACE)
   */
  private async isSpace(model: FRAGS.FragmentsModel, localId: number): Promise<boolean> {
    try {
      const categories = await model.getCategories();
      if (!categories.includes('IFCSPACE')) return false;

      const spaceItems = await model.getItemsOfCategory('IFCSPACE');
      
      for (const item of spaceItems) {
        const itemLocalId = await item.getLocalId();
        if (itemLocalId === localId) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ Error verificando si es espacio:', error);
      return false;
    }
  }

  /**
   * Maneja el hover sobre un espacio
   */
  private async handleSpaceHover(
    model: FRAGS.FragmentsModel, 
    localId: number, 
    intersectionPoint: THREE.Vector3
  ): Promise<void> {
    try {
      // Obtener GUID del espacio
      const spaceItems = await model.getItemsOfCategory('IFCSPACE');
      let spaceGuid: string | null = null;
      let spaceName: string = '';

      for (const item of spaceItems) {
        const itemLocalId = await item.getLocalId();
        if (itemLocalId === localId) {
          spaceGuid = await item.getGuid();
          
          // Obtener nombre del espacio
          const itemsData = await model.getItemsData([localId], {
            includeProperties: true
          });
          
          if (itemsData && itemsData.length > 0) {
            spaceName = this.extractPropertyValue(itemsData[0], 'Name') || `Espacio ${localId}`;
          }
          break;
        }
      }

      if (!spaceGuid) return;

      // Verificar si ya estamos hovering este espacio
      if (this.currentHoveredSpace && this.currentHoveredSpace.spaceGuid === spaceGuid) {
        return;
      }

      // Limpiar hover anterior
      this.clearCurrentHover();

      // Crear datos del nuevo hover
      const hoverData: HoverEventData = {
        spaceGuid,
        spaceName,
        localId,
        model,
        mousePosition: this.mousePosition,
        spaceCenter: intersectionPoint
      };

      this.currentHoveredSpace = hoverData;

      // Ejecutar callback con un pequeño delay para evitar flickering
      if (this.hoverTimeout) {
        clearTimeout(this.hoverTimeout);
      }

      this.hoverTimeout = setTimeout(() => {
        if (this.currentHoveredSpace === hoverData && this.onSpaceHoverCallback) {
          this.onSpaceHoverCallback(hoverData);
        }
      }, 100); // 100ms delay

    } catch (error) {
      console.warn('⚠️ Error manejando hover de espacio:', error);
    }
  }

  /**
   * Limpia el hover actual
   */
  private clearCurrentHover(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    if (this.currentHoveredSpace) {
      this.currentHoveredSpace = null;
      
      if (this.onSpaceLeaveCallback) {
        this.onSpaceLeaveCallback();
      }
    }
  }

  /**
   * Configura callback para cuando se hace hover sobre un espacio
   */
  onSpaceHover(callback: (data: HoverEventData) => void): void {
    this.onSpaceHoverCallback = callback;
  }

  /**
   * Configura callback para cuando se deja de hacer hover
   */
  onSpaceLeave(callback: () => void): void {
    this.onSpaceLeaveCallback = callback;
  }

  /**
   * Configura callback para solicitar datos de sensores
   */
  onSpaceDataRequest(callback: (spaceGuid: string) => Promise<SpaceSensorData | null>): void {
    this.onSpaceDataRequestCallback = callback;
  }

  /**
   * Obtiene datos de sensores para un espacio
   */
  async getSpaceData(spaceGuid: string): Promise<SpaceSensorData | null> {
    // Verificar cache primero
    const cached = this.spaceDataCache.get(spaceGuid);
    if (cached) {
      const age = Date.now() - new Date(cached.timestamp).getTime();
      if (age < 30000) { // Cache válido por 30 segundos
        return cached;
      }
    }

    // Solicitar datos frescos
    if (this.onSpaceDataRequestCallback) {
      const data = await this.onSpaceDataRequestCallback(spaceGuid);
      if (data) {
        this.spaceDataCache.set(spaceGuid, data);
      }
      return data;
    }

    return null;
  }

  /**
   * Limpia el cache de datos
   */
  clearCache(): void {
    this.spaceDataCache.clear();
  }

  /**
   * Limpia todos los recursos
   */
  dispose(): void {
    console.log('🧹 Disposing HeatMapHoverManager...');
    
    this.setActive(false);
    this.clearCurrentHover();
    this.clearCache();
    
    // Remover event listeners
    if (this.world && this.world.renderer) {
      const canvas = this.world.renderer.three.domElement;
      canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
      canvas.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    }
    
    this.guidToLocalIdMap.clear();
    this.world = null;
    this.fragments = null;
    
    console.log('✅ HeatMapHoverManager disposed');
  }

  /**
   * Getters de estado
   */
  get active(): boolean {
    return this.isActive;
  }

  get currentSpace(): HoverEventData | null {
    return this.currentHoveredSpace;
  }

  get spacesCount(): number {
    return this.guidToLocalIdMap.size;
  }
}

// Exportar instancia singleton
export const heatMapHoverManager = new HeatMapHoverManager();

export default heatMapHoverManager;