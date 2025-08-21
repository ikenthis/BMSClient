"use client";
// ModelRaycastCache.ts - Sistema de caché para referencias estables de raycasting
import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';

export class ModelRaycastCache {
  private static instance: ModelRaycastCache;
  
  // Referencias críticas para raycasting
  world: any = null;
  camera: THREE.Camera | null = null;
  renderer: any = null;
  fragments: any = null;
  models: FRAGS.FragmentsModel[] = [];
  container: HTMLElement | null = null;
  
  // Estado de selección
  selectedModel: FRAGS.FragmentsModel | null = null;
  selectedLocalId: number | null = null;
  
  // Material para highlight
  highlightMaterial = {
    color: new THREE.Color("gold"),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 1,
    transparent: false
  };
  
  // Event handler persistente
  clickHandler: ((event: MouseEvent) => Promise<void>) | null = null;
  
  // Control de estado
  isRaycasting = false;
  handlerId = `raycast-${Math.random().toString(36).slice(2, 9)}`;
  
  // Constructor privado (patrón singleton)
  private constructor() {
    console.log("🏗️ ModelRaycastCache creado con ID:", this.handlerId);
  }
  
  // Obtener instancia
  public static getInstance(): ModelRaycastCache {
    if (!ModelRaycastCache.instance) {
      ModelRaycastCache.instance = new ModelRaycastCache();
    }
    return ModelRaycastCache.instance;
  }
  
  // Métodos para actualizar referencias
  updateWorld(world: any): void {
    if (world !== this.world) {
      this.world = world;
      if (world && world.camera) this.camera = world.camera.three;
      if (world && world.renderer) this.renderer = world.renderer.three;
      console.log("🌎 Cache: World actualizado");
    }
  }
  
  updateFragments(fragments: any): void {
    if (fragments !== this.fragments) {
      this.fragments = fragments;
      console.log("🧩 Cache: Fragments actualizado");
    }
  }
  
  updateModels(models: FRAGS.FragmentsModel[]): void {
    // Solo actualizar si los modelos han cambiado
    const currentIds = this.models.map(m => m.id).sort().join(',');
    const newIds = models.map(m => m.id).sort().join(',');
    
    if (currentIds !== newIds) {
      this.models = models;
      console.log(`📦 Cache: ${models.length} modelos actualizados`);
    }
  }
  
  updateContainer(container: HTMLElement | null): void {
    if (container !== this.container) {
      this.container = container;
      console.log("📦 Cache: Container actualizado");
    }
  }
  
  // Limpiar selección
  async resetHighlight(): Promise<void> {
    if (!this.selectedModel || this.selectedLocalId === null) return;
    
    try {
      await this.selectedModel.resetHighlight([this.selectedLocalId]);
    } catch (error) {
      console.warn("Error al resetear highlight:", error);
    }
  }
  
  // Resaltar elemento
  async highlight(): Promise<void> {
    if (!this.selectedModel || this.selectedLocalId === null) return;
    
    try {
      await this.selectedModel.highlight([this.selectedLocalId], this.highlightMaterial);
    } catch (error) {
      console.warn("Error al aplicar highlight:", error);
    }
  }
  
  // Verificar si todas las referencias están listas
  isReady(): boolean {
    return !!(
      this.world && 
      this.camera && 
      this.renderer && 
      this.fragments && 
      this.models.length > 0 &&
      this.container
    );
  }
  
  // Registrar/desregistrar evento de click
  registerClickEvent(onItemSelected: (item: any) => void): void {
    if (!this.container) return;
    
    // Si ya hay un handler registrado con el mismo contenedor, no hacer nada
    if (this.clickHandler && this.container.hasEventListener('click', this.clickHandler)) {
      console.log(`✓ Event listener ya registrado (ID: ${this.handlerId})`);
      return;
    }
    
    console.log(`🔄 Registrando event listener (ID: ${this.handlerId})`);
    
    // Crear handler persistente si no existe
    if (!this.clickHandler) {
      this.clickHandler = this.createClickHandler(onItemSelected);
    }
    
    // Registrar evento
    this.container.addEventListener('click', this.clickHandler);
  }
  
  // Método para verificar si un event listener ya está registrado
  hasEventListener(container: HTMLElement, eventName: string, handler: EventListener): boolean {
    // Desafortunadamente no hay API estándar para esto, así que devolvemos false
    // para ser seguros. Podríamos usar una bandera interna si es necesario.
    return false;
  }
  
  unregisterClickEvent(): void {
    if (!this.container || !this.clickHandler) return;
    
    console.log(`🧹 Desregistrando event listener (ID: ${this.handlerId})`);
    this.container.removeEventListener('click', this.clickHandler);
  }
  
  // Crear handler de click
  private createClickHandler(onItemSelected: (item: any) => void): (event: MouseEvent) => Promise<void> {
    return async (event: MouseEvent) => {
      // Evitar procesamiento simultáneo
      if (this.isRaycasting) {
        console.log(`⏳ Raycasting ya en proceso (ID: ${this.handlerId})`);
        return;
      }
      
      // Verificar que todo esté listo
      if (!this.isReady()) {
        console.warn(`⚠️ No se puede realizar raycasting - componentes no inicializados (ID: ${this.handlerId})`);
        return;
      }
      
      this.isRaycasting = true;
      console.log(`👆 Click detectado (ID: ${this.handlerId})`);
      
      try {
        // Preparar mouse exactamente como en el ejemplo original
        const mouse = new THREE.Vector2();
        mouse.x = event.clientX;
        mouse.y = event.clientY;
        
        const promises = [];
        
        // Limpiar selección previa
        promises.push(this.resetHighlight());
        
        // Resetear estado de selección
        let prevSelectedModel = this.selectedModel;
        let prevSelectedLocalId = this.selectedLocalId;
        
        this.selectedModel = null;
        this.selectedLocalId = null;
        
        let foundElement = false;
        
        // Intentar raycasting en cada modelo
        for (const model of this.models) {
          if (!model || !model.raycast) continue;
          
          try {
            console.log(`Intentando raycast en modelo ${model.id || 'sin ID'}...`);
            
            // Llamar a raycast
            const result = await model.raycast({
              camera: this.camera,
              mouse: mouse,
              dom: this.renderer.domElement
            });
            
            if (result) {
              console.log(`✅ Elemento encontrado en modelo ${model.id}, ID: ${result.localId}`);
              
              // Actualizar selección
              this.selectedModel = model;
              this.selectedLocalId = result.localId;
              
              // Obtener datos
              try {
                const [itemData] = await model.getItemsData([result.localId], {
                  attributesDefault: true,
                  relations: {
                    IsDefinedBy: { attributes: true, relations: true },
                    ContainedInStructure: { attributes: true, relations: false }
                  }
                });
                
                const selectedItemData = {
                  model: model,
                  localId: result.localId,
                  data: itemData
                };
                
                // Llamar al callback
                onItemSelected(selectedItemData);
                
              } catch (error) {
                console.warn("Error al obtener datos:", error);
                // Aún notificar selección con datos mínimos
                onItemSelected({
                  model: model,
                  localId: result.localId
                });
              }
              
              // Aplicar highlight
              promises.push(this.highlight());
              
              foundElement = true;
              break; // Salir del bucle después de encontrar un elemento
            }
          } catch (error) {
            console.warn(`Error en raycast del modelo ${model.id}:`, error);
            // Continuar con el siguiente modelo
          }
        }
        
        // Si no encontramos nada, notificar que no hay selección
        if (!foundElement) {
          onItemSelected(null);
        }
        
        // Actualizar visualización al final
        if (this.fragments) {
          promises.push(this.fragments.update(true));
        }
        
        // Ejecutar todas las promesas
        await Promise.all(promises);
        
      } catch (error) {
        console.error(`❌ Error en raycasting (ID: ${this.handlerId}):`, error);
        // Restaurar estado previo en caso de error
        this.selectedModel = prevSelectedModel;
        this.selectedLocalId = prevSelectedLocalId;
      } finally {
        this.isRaycasting = false;
      }
    };
  }
}