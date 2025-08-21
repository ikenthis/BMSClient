// ============================================================================
// services/FloorPlansService.ts - CON DEBUGGING EXTENSO
// ============================================================================

import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import { 
  FloorPlan, 
  StyleConfiguration, 
  FloorPlansConfig 
} from '../types/FloorPlansTypes';
import { 
  FLOORPLAN_CATEGORIES, 
  DEFAULT_STYLE_CONFIG,
  FLOORPLAN_CONFIG_DEFAULTS 
} from '../constants/FloorPlansConstants';

export class FloorPlansService {
  private static world: any;
  private static fragments: any;
  private static models: any[];
  private static plans: any;
  private static isInitialized: boolean = false;

  /**
   * Inicializa el servicio - CORREGIDO para tu estructura
   */
  static initialize(
    fragments: any,
    world: any,
    config: FloorPlansConfig = FLOORPLAN_CONFIG_DEFAULTS
  ) {
    console.log('=== INICIALIZANDO FLOORPLANS SERVICE CON DEBUGGING ===');
    
    this.fragments = fragments;
    this.world = world;
    this.models = [];
    
    // Diagnóstico detallado
    console.log('Estructura recibida:', {
      fragments: !!fragments,
      world: !!world,
      worldKeys: world ? Object.keys(world) : [],
      worldType: world?.constructor?.name,
    });

    if (!world || !fragments) {
      console.error('Missing required parameters:', { world: !!world, fragments: !!fragments });
      throw new Error('World and fragments are required for FloorPlans initialization');
    }

    try {
      // Inicializar mock de Plans adaptado
      this.initializePlansService(config);
      this.isInitialized = true;
      console.log('✅ FloorPlansService initialized successfully');

    } catch (error) {
      console.error('Error initializing FloorPlansService:', error);
      throw error;
    }
  }

  /**
   * Inicializa el servicio de Plans adaptado a tu arquitectura
   */
  private static initializePlansService(config: FloorPlansConfig) {
    console.log('Creating Plans service for your architecture');
    
    this.plans = {
      world: this.world,
      list: [],
      currentPlanId: null,
      
      generate: async (model: any) => {
        console.log('=== INICIANDO GENERACIÓN DE PLANOS CON DEBUGGING COMPLETO ===');
        console.log('🔍 Model received:', {
          hasModel: !!model,
          modelId: model?.id,
          modelName: model?.name,
          modelType: typeof model,
          modelConstructor: model?.constructor?.name,
          modelKeys: model ? Object.keys(model).slice(0, 20) : [], // Primeras 20 propiedades
          hasGetItemsOfCategory: typeof model?.getItemsOfCategory === 'function',
          hasGetCategories: typeof model?.getCategories === 'function',
          hasGetBoxes: typeof model?.getBoxes === 'function',
          hasGetItemsData: typeof model?.getItemsData === 'function'
        });

        try {
          // Verificación básica del modelo
          if (!model) {
            console.error('❌ No model provided');
            return this.createFallbackPlans();
          }

          if (typeof model.getItemsOfCategory !== 'function') {
            console.warn('⚠️ Model does not support getItemsOfCategory');
            console.log('Available model methods:', 
              Object.getOwnPropertyNames(Object.getPrototypeOf(model))
                .filter(prop => typeof model[prop] === 'function')
            );
            return this.createFallbackPlans();
          }

          // 1. OBTENER CATEGORÍAS DISPONIBLES
          console.log('🏗️ PASO 1: Obteniendo categorías disponibles...');
          let availableCategories = [];
          try {
            if (typeof model.getCategories === 'function') {
              availableCategories = await model.getCategories();
              console.log('✅ Categorías obtenidas:', availableCategories);
            } else {
              console.log('⚠️ getCategories no disponible, usando categorías estándar');
              availableCategories = ['IFCSPACE', 'IFCWALL', 'IFCSLAB', 'IFCDOOR', 'IFCWINDOW', 'IFCCOLUMN', 'IFCBEAM'];
            }
          } catch (error) {
            console.error('❌ Error obteniendo categorías:', error);
            availableCategories = ['IFCSPACE', 'IFCWALL', 'IFCSLAB', 'IFCDOOR', 'IFCWINDOW'];
          }

          // 2. ANÁLISIS DE ESPACIOS (ESTRATEGIA 1)
          console.log('🏢 PASO 2: Analizando espacios...');
          if (availableCategories.includes('IFCSPACE')) {
            console.log('✅ IFCSPACE disponible, analizando...');
            const spacePlans = await this.analyzeSpacesForPlansDebug(model);
            if (spacePlans.length > 0) {
              console.log('🎉 ÉXITO EN ESTRATEGIA 1:', spacePlans.length, 'planos de espacios');
              this.plans.list = spacePlans;
              return spacePlans;
            } else {
              console.log('⚠️ No se generaron planos de espacios');
            }
          } else {
            console.log('⚠️ IFCSPACE no encontrado en categorías');
          }

          // 3. ANÁLISIS ESTRUCTURAL (ESTRATEGIA 2)
          console.log('🏗️ PASO 3: Analizando estructura...');
          const structuralPlans = await this.analyzeStructureForPlansDebug(model);
          if (structuralPlans.length > 0) {
            console.log('🎉 ÉXITO EN ESTRATEGIA 2:', structuralPlans.length, 'planos estructurales');
            this.plans.list = structuralPlans;
            return structuralPlans;
          } else {
            console.log('⚠️ No se generaron planos estructurales');
          }

          // 4. ANÁLISIS GENERAL (ESTRATEGIA 3)
          console.log('🔍 PASO 4: Análisis general de elementos...');
          const generalPlans = await this.analyzeGeneralElementsDebug(model, availableCategories);
          if (generalPlans.length > 0) {
            console.log('🎉 ÉXITO EN ESTRATEGIA 3:', generalPlans.length, 'planos generales');
            this.plans.list = generalPlans;
            return generalPlans;
          } else {
            console.log('⚠️ No se generaron planos generales');
          }

          // 5. FALLBACK (ESTRATEGIA 4)
          console.log('🆘 PASO 5: Usando planes de fallback...');
          const fallbackPlans = this.createFallbackPlans();
          this.plans.list = fallbackPlans;
          console.log('✅ Fallback plans created:', fallbackPlans);
          return fallbackPlans;

        } catch (error) {
          console.error('❌ Error crítico en generate:', error);
          console.error('Stack trace:', error.stack);
          const fallbackPlans = this.createFallbackPlans();
          this.plans.list = fallbackPlans;
          return fallbackPlans;
        }
      },
      
      goTo: (planId: string) => {
        console.log('🧭 Navigating to plan:', planId);
        this.plans.currentPlanId = planId;
        this.navigateToFloorPlan(planId);
      },
      
      exitPlanView: () => {
        console.log('🚪 Exiting plan view');
        this.plans.currentPlanId = null;
        this.exitFloorPlanView();
      }
    };
  }

  /**
   * Analiza espacios del modelo CON DEBUGGING
   */
  private static async analyzeSpacesForPlansDebug(model: any): Promise<FloorPlan[]> {
    console.log('🏢 === ANÁLISIS DETALLADO DE ESPACIOS ===');
    
    try {
      console.log('📋 Obteniendo elementos IFCSPACE...');
      const spaces = await model.getItemsOfCategory('IFCSPACE');
      console.log(`✅ Encontrados ${spaces.length} espacios`);

      if (!spaces || spaces.length === 0) {
        console.log('❌ No hay espacios para analizar');
        return [];
      }

      // Analizar estructura de los espacios
      console.log('🔍 Analizando estructura de espacios...');
      const firstSpace = spaces[0];
      console.log('Estructura del primer espacio:', {
        hasGetLocalId: typeof firstSpace?.getLocalId === 'function',
        hasGetGuid: typeof firstSpace?.getGuid === 'function',
        spaceKeys: firstSpace ? Object.keys(firstSpace).slice(0, 10) : [],
        spaceType: typeof firstSpace,
        spaceConstructor: firstSpace?.constructor?.name
      });

      const levelsMap = new Map<number, { name: string; elevation: number; count: number }>();
      let processedSpaces = 0;

      // Analizar espacios uno por uno
      for (let i = 0; i < Math.min(spaces.length, 10); i++) {
        const space = spaces[i];
        console.log(`🔍 Procesando espacio ${i + 1}/${Math.min(spaces.length, 10)}...`);
        
        try {
          console.log('  📍 Obteniendo localId...');
          const localId = await space.getLocalId();
          console.log(`  ✅ LocalId obtenido: ${localId}`);
          
          if (localId === null) {
            console.log('  ⚠️ LocalId es null, saltando...');
            continue;
          }

          console.log('  📦 Obteniendo bounding box...');
          const boxes = await model.getBoxes([localId]);
          console.log(`  📦 Boxes obtenidas:`, boxes ? boxes.length : 'null');
          
          if (boxes && boxes.length > 0) {
            const box = boxes[0];
            console.log('  📐 Box data:', {
              min: { x: box.min.x, y: box.min.y, z: box.min.z },
              max: { x: box.max.x, y: box.max.y, z: box.max.z }
            });
            
            const elevation = Math.round(box.min.y / 100) * 100;
            const level = Math.round(elevation / 3000);
            console.log(`  📏 Elevation: ${elevation}mm, Level: ${level}`);

            if (!levelsMap.has(level)) {
              levelsMap.set(level, {
                name: level === 0 ? 'Planta Baja' : `Planta ${level}`,
                elevation,
                count: 0
              });
            }
            
            levelsMap.get(level)!.count++;
            processedSpaces++;
          } else {
            console.log('  ❌ No se pudieron obtener boxes');
          }
        } catch (spaceError) {
          console.error(`  ❌ Error procesando espacio ${i}:`, spaceError);
        }
      }

      console.log(`📊 Espacios procesados: ${processedSpaces}/${spaces.length}`);
      console.log('📊 Niveles encontrados:', Array.from(levelsMap.entries()));

      // Convertir a FloorPlans
      const floorPlans: FloorPlan[] = [];
      levelsMap.forEach((levelInfo, level) => {
        floorPlans.push({
          id: `space_level_${level}`,
          name: `${levelInfo.name} (${levelInfo.count} espacios)`,
          level,
          elevation: levelInfo.elevation
        });
      });

      console.log(`🎉 Generados ${floorPlans.length} planos de espacios:`, floorPlans);
      return floorPlans.sort((a, b) => a.level! - b.level!);

    } catch (error) {
      console.error('❌ Error en análisis de espacios:', error);
      console.error('Stack trace:', error.stack);
      return [];
    }
  }

  /**
   * Analiza estructura del modelo CON DEBUGGING
   */
  private static async analyzeStructureForPlansDebug(model: any): Promise<FloorPlan[]> {
    console.log('🏗️ === ANÁLISIS DETALLADO DE ESTRUCTURA ===');
    
    try {
      const categories = ['IFCSLAB', 'IFCWALL', 'IFCBEAM', 'IFCCOLUMN'];
      const elevations = new Set<number>();
      let totalElementsFound = 0;

      for (const category of categories) {
        console.log(`🔍 Analizando categoría: ${category}...`);
        
        try {
          const elements = await model.getItemsOfCategory(category);
          console.log(`  ✅ ${category}: ${elements.length} elementos`);
          totalElementsFound += elements.length;

          if (elements.length === 0) continue;

          // Analizar algunos elementos para elevaciones
          const sampleSize = Math.min(elements.length, 5);
          console.log(`  📊 Analizando muestra de ${sampleSize} elementos...`);
          
          for (let i = 0; i < sampleSize; i++) {
            const element = elements[i];
            
            try {
              const localId = await element.getLocalId();
              if (localId === null) continue;

              const boxes = await model.getBoxes([localId]);
              if (boxes && boxes.length > 0) {
                const box = boxes[0];
                const elevation = Math.round(box.min.y / 500) * 500;
                elevations.add(elevation);
                console.log(`    📏 Elemento ${localId}: elevación ${elevation}mm`);
              }
            } catch (elementError) {
              console.warn(`    ⚠️ Error en elemento ${i}:`, elementError);
            }
          }
        } catch (categoryError) {
          console.error(`  ❌ Error analizando ${category}:`, categoryError);
        }
      }

      console.log(`📊 Total elementos encontrados: ${totalElementsFound}`);
      console.log(`📊 Elevaciones únicas: ${Array.from(elevations)}`);

      if (elevations.size === 0) {
        console.log('❌ No se encontraron elevaciones válidas');
        return [];
      }

      // Crear plantas
      const floorPlans: FloorPlan[] = [];
      const sortedElevations = Array.from(elevations).sort((a, b) => a - b);
      
      sortedElevations.forEach((elevation, index) => {
        floorPlans.push({
          id: `structure_${index}`,
          name: index === 0 ? `Planta Baja (${elevation}mm)` : `Planta ${index} (${elevation}mm)`,
          level: index,
          elevation
        });
      });

      console.log(`🎉 Generados ${floorPlans.length} planos estructurales:`, floorPlans);
      return floorPlans;

    } catch (error) {
      console.error('❌ Error en análisis estructural:', error);
      console.error('Stack trace:', error.stack);
      return [];
    }
  }

  /**
   * Análisis general de elementos CON DEBUGGING
   */
  private static async analyzeGeneralElementsDebug(model: any, categories: string[]): Promise<FloorPlan[]> {
    console.log('🔍 === ANÁLISIS GENERAL DE ELEMENTOS ===');
    console.log('📋 Categorías a analizar:', categories);
    
    try {
      let totalElements = 0;
      const elevations = new Set<number>();
      const categoryCounts: Record<string, number> = {};

      // Probar cada categoría
      for (const category of categories.slice(0, 15)) { // Limitar a 15 categorías
        console.log(`🔍 Probando categoría: ${category}...`);
        
        try {
          const elements = await model.getItemsOfCategory(category);
          const count = elements.length;
          categoryCounts[category] = count;
          totalElements += count;
          
          console.log(`  ✅ ${category}: ${count} elementos`);
          
          if (count > 0) {
            // Analizar algunos elementos
            const sampleSize = Math.min(count, 3);
            for (let i = 0; i < sampleSize; i++) {
              try {
                const element = elements[i];
                const localId = await element.getLocalId();
                if (localId !== null) {
                  const boxes = await model.getBoxes([localId]);
                  if (boxes && boxes.length > 0) {
                    const elevation = Math.round(boxes[0].min.y / 1000) * 1000;
                    elevations.add(elevation);
                    console.log(`    📏 Muestra ${i}: elevación ${elevation}mm`);
                  }
                }
              } catch (sampleError) {
                console.warn(`    ⚠️ Error en muestra ${i}:`, sampleError);
              }
            }
          }
        } catch (categoryError) {
          console.warn(`  ❌ Error con categoría ${category}:`, categoryError);
          categoryCounts[category] = 0;
        }
      }

      console.log('📊 RESUMEN DEL ANÁLISIS GENERAL:');
      console.log(`  Total elementos: ${totalElements}`);
      console.log(`  Conteo por categoría:`, categoryCounts);
      console.log(`  Elevaciones encontradas: ${Array.from(elevations)}`);

      // Generar planes basados en los resultados
      if (totalElements > 0) {
        if (elevations.size > 0) {
          // Crear planes basados en elevaciones
          const floorPlans: FloorPlan[] = [];
          const sortedElevations = Array.from(elevations).sort((a, b) => a - b);
          
          sortedElevations.forEach((elevation, index) => {
            floorPlans.push({
              id: `general_level_${index}`,
              name: index === 0 ? 
                `Planta Principal (${elevation}mm, ${totalElements} elementos)` : 
                `Nivel ${index} (${elevation}mm)`,
              level: index,
              elevation
            });
          });
          
          console.log(`🎉 Generados ${floorPlans.length} planos generales:`, floorPlans);
          return floorPlans;
        } else {
          // Plan único sin elevaciones
          const singlePlan: FloorPlan = {
            id: 'single_level',
            name: `Planta Única (${totalElements} elementos)`,
            level: 0,
            elevation: 0
          };
          
          console.log('🎉 Generado plan único:', singlePlan);
          return [singlePlan];
        }
      }

      console.log('❌ No se encontraron elementos para generar planos');
      return [];

    } catch (error) {
      console.error('❌ Error en análisis general:', error);
      console.error('Stack trace:', error.stack);
      return [];
    }
  }

  /**
   * Crea plantas de fallback CON DEBUGGING
   */
  private static createFallbackPlans(): FloorPlan[] {
    console.log('🆘 === CREANDO PLANES DE FALLBACK ===');
    
    const fallbackPlans = [
      {
        id: 'ground_floor',
        name: 'Planta Baja (Fallback)',
        level: 0,
        elevation: 0
      },
      {
        id: 'first_floor', 
        name: 'Primera Planta (Fallback)',
        level: 1,
        elevation: 3000
      }
    ];
    
    console.log('✅ Planes de fallback creados:', fallbackPlans);
    return fallbackPlans;
  }

  // ... resto de métodos (navegación, etc.) permanecen igual ...

  /**
   * Navega a un plano específico
   */
  private static navigateToFloorPlan(planId: string) {
    console.log(`🧭 Navegando a plano: ${planId}`);

    try {
      const plan = this.plans.list.find((p: FloorPlan) => p.id === planId);
      if (!plan) {
        console.warn('❌ Plan no encontrado:', planId);
        return;
      }

      const camera = this.findCamera();
      if (!camera) {
        console.warn('❌ No se encontró cámara');
        return;
      }

      console.log('✅ Cámara encontrada, aplicando vista...');
      const targetY = (plan.elevation || 0) + 50;
      
      this.applyCameraView(camera, {
        position: [0, targetY, 0],
        target: [0, plan.elevation || 0, 0]
      });

      this.applyFloorPlanStyle();
      console.log(`✅ Navegación exitosa a ${plan.name}`);

    } catch (error) {
      console.error('❌ Error navegando:', error);
    }
  }

  private static findCamera(): any {
    if (!this.world) return null;

    const cameraRoutes = [
      () => this.world._camera,
      () => this.world.camera,
      () => this.world.scene?.camera,
      () => this.world.renderer?.camera,
    ];

    for (const route of cameraRoutes) {
      try {
        const camera = route();
        if (camera) {
          console.log('✅ Cámara encontrada');
          return camera;
        }
      } catch (error) {
        // Continuar
      }
    }

    return null;
  }

  private static applyCameraView(camera: any, view: { position: number[], target: number[] }) {
    try {
      if (camera.controls && camera.controls.setLookAt) {
        camera.controls.setLookAt(
          view.position[0], view.position[1], view.position[2],
          view.target[0], view.target[1], view.target[2]
        );
      } else if (camera.setLookAt) {
        camera.setLookAt(
          view.position[0], view.position[1], view.position[2],
          view.target[0], view.target[1], view.target[2]
        );
      }
      console.log('✅ Vista de cámara aplicada');
    } catch (error) {
      console.warn('⚠️ No se pudo aplicar vista:', error);
    }
  }

  private static applyFloorPlanStyle() {
    try {
      const scene = this.findScene();
      if (scene) {
        scene.background = new THREE.Color('white');
        console.log('✅ Fondo blanco aplicado');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo aplicar estilo:', error);
    }
  }

  private static findScene(): any {
    if (!this.world) return null;

    const sceneRoutes = [
      () => this.world._scene?.three,
      () => this.world.scene?.three,
      () => this.world.three,
    ];

    for (const route of sceneRoutes) {
      try {
        const scene = route();
        if (scene) return scene;
      } catch (error) {
        // Continuar
      }
    }

    return null;
  }

  private static exitFloorPlanView() {
    console.log('🚪 Saliendo de vista de plano...');

    try {
      const camera = this.findCamera();
      if (camera) {
        this.applyCameraView(camera, {
          position: [12, 6, 8],
          target: [0, 0, -10]
        });
      }

      const scene = this.findScene();
      if (scene) {
        scene.background = null;
      }

      console.log('✅ Vista de plano cerrada');
    } catch (error) {
      console.error('❌ Error cerrando vista:', error);
    }
  }

  // ===== MÉTODOS PÚBLICOS (igual que antes) =====

  static async generateFloorPlans(model: any): Promise<FloorPlan[]> {
    if (!this.isInitialized || !this.plans) {
      throw new Error('FloorPlans service not initialized');
    }

    try {
      console.log('🚀 === INICIANDO GENERACIÓN DESDE MÉTODO PÚBLICO ===');
      console.log('📋 Model info:', {
        hasModel: !!model,
        modelId: model?.id,
        modelName: model?.name
      });
      
      const plans = await this.plans.generate(model);
      console.log(`🎉 GENERACIÓN COMPLETADA: ${plans.length} planos`);
      return plans;
      
    } catch (error) {
      console.error('❌ ERROR EN MÉTODO PÚBLICO:', error);
      throw new Error(`Failed to generate floor plans: ${error}`);
    }
  }

  static async navigateToPlan(planId: string, applyPlanStyle: boolean = true): Promise<void> {
    if (!this.isInitialized || !this.plans) {
      throw new Error('FloorPlans service not initialized');
    }

    try {
      this.plans.goTo(planId);
      console.log(`✅ Navegado a plan: ${planId}`);
    } catch (error) {
      console.error('❌ Error navegando:', error);
      throw error;
    }
  }

  static async exitPlanView(): Promise<void> {
    if (!this.isInitialized || !this.plans) return;

    try {
      this.plans.exitPlanView();
      console.log('✅ Vista cerrada');
    } catch (error) {
      console.error('❌ Error cerrando vista:', error);
      throw error;
    }
  }

  static getAvailablePlans(): FloorPlan[] {
    if (!this.isInitialized || !this.plans || !this.plans.list) {
      return [];
    }

    return this.plans.list.map((plan: any) => ({
      id: plan.id,
      name: plan.name || `Plan ${plan.id}`,
      level: plan.level,
      elevation: plan.elevation
    }));
  }

  static hasPlans(): boolean {
    return this.isInitialized && this.plans && this.plans.list && this.plans.list.length > 0;
  }

  static clearPlans(): void {
    if (this.plans && this.plans.list) {
      this.plans.list = [];
      this.plans.currentPlanId = null;
    }
  }

  static getPlanInfo(planId: string): FloorPlan | null {
    if (!this.plans || !this.plans.list) {
      return null;
    }

    const plan = this.plans.list.find((p: any) => p.id === planId);
    if (!plan) return null;

    return {
      id: plan.id,
      name: plan.name || `Plan ${plan.id}`,
      level: plan.level,
      elevation: plan.elevation
    };
  }

  static isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  static getModeInfo(): { mode: string; features: string[] } {
    return {
      mode: 'Debug Mode for your BIM architecture',
      features: ['Extensive Debugging', 'Floor Plans Generation', 'Navigation', 'Style Application']
    };
  }

  static dispose(): void {
    this.plans = null;
    this.world = null;
    this.fragments = null;
    this.models = [];
    this.isInitialized = false;
  }
}