"use client";

import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import { HighlightMaterial } from './typeDefs';

// Material predeterminado para resaltar elementos seleccionados
export const defaultHighlightMaterial: HighlightMaterial = {
  color: new THREE.Color("darkblue"),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 1,
  transparent: false
};

// Material alternativo para resaltar elementos con errores
export const errorHighlightMaterial: HighlightMaterial = {
  color: new THREE.Color("red"),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 1,
  transparent: false
};

// Material para resaltar elementos temporalmente (por ejemplo, al pasar el mouse)
export const tempHighlightMaterial: HighlightMaterial = {
  color: new THREE.Color("limegreen"),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 0.3,  // Más transparente para hover
  transparent: true
};

// Material para hover específicamente
export const hoverHighlightMaterial: HighlightMaterial = {
  color: new THREE.Color(0x3b9aff),  // Color azul más claro
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 0.3,
  transparent: true
};

/**
 * Función para resaltar un elemento seleccionado
 */
export const highlightElement = async (
  model: FRAGS.FragmentsModel | null, 
  localId: number | null,
  material: HighlightMaterial = defaultHighlightMaterial
): Promise<void> => {
  if (!localId || !model) return;
  await model.highlight([localId], material);
};

/**
 * Función para quitar el resaltado de un elemento
 */
export const resetHighlight = async (
  model: FRAGS.FragmentsModel | null, 
  localId: number | null
): Promise<void> => {
  if (!localId || !model) return;
  await model.resetHighlight([localId]);
};

/**
 * Función para resaltar múltiples elementos en un modelo
 */
export const highlightMultipleElements = async (
  model: FRAGS.FragmentsModel | null,
  localIds: number[],
  material: HighlightMaterial = defaultHighlightMaterial
): Promise<void> => {
  if (!model || !localIds || localIds.length === 0) return;
  await model.highlight(localIds, material);
};

/**
 * Función para quitar el resaltado de múltiples elementos
 */
export const resetMultipleHighlights = async (
  model: FRAGS.FragmentsModel | null,
  localIds: number[]
): Promise<void> => {
  if (!model || !localIds || localIds.length === 0) return;
  await model.resetHighlight(localIds);
};

/**
 * Función para resaltar elementos por categoría IFC
 */
export const highlightElementsByCategory = async (
  model: FRAGS.FragmentsModel | null,
  category: string,
  material: HighlightMaterial = defaultHighlightMaterial
): Promise<void> => {
  if (!model || !category) return;
  
  try {
    // Obtener elementos de esta categoría
    const items = await model.getItemsOfCategory(category);
    if (!items || !items.length) return;
    
    // Obtener los IDs locales de los elementos
    const localIds: number[] = [];
    for (const item of items) {
      if (!item) continue;
      try {
        const localId = await item.getLocalId();
        if (localId !== null && localId !== undefined) {
          localIds.push(localId);
        }
      } catch (e) {
        // Ignorar errores al obtener ID local
      }
    }
    
    if (localIds.length > 0) {
      await model.highlight(localIds, material);
    }
  } catch (error) {
    console.warn(`Error al resaltar categoría ${category}:`, error);
  }
};

/**
 * Resalta elementos de una misma categoría en múltiples modelos
 */
export const highlightCategoryAcrossModels = async (
  models: FRAGS.FragmentsModel[],
  category: string,
  material: HighlightMaterial = defaultHighlightMaterial
): Promise<void> => {
  if (!models || models.length === 0 || !category) return;
  
  const promises = models.map(model => highlightElementsByCategory(model, category, material));
  await Promise.all(promises);
};

// ----- NUEVAS FUNCIONALIDADES -----

/**
 * Clase para gestionar el resaltado al pasar el mouse sobre elementos (hover)
 */
export class HoverHighlighter {
  private world: OBC.World;
  private fragments: FRAGS.FragmentsModels;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private enabled: boolean = false;
  private currentHoveredId: { modelId: string, localId: number } | null = null;
  private hoverMaterial: HighlightMaterial;
  private excludedElementIds: Set<number> = new Set();
  private onHoverCallback: ((modelId: string, localId: number) => void) | null = null;

  constructor(
    world: OBC.World, 
    fragments: FRAGS.FragmentsModels, 
    material: HighlightMaterial = hoverHighlightMaterial
  ) {
    this.world = world;
    this.fragments = fragments;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hoverMaterial = material;
    
    // Añadir los event listeners
    this.addEventListeners();
  }

  /**
   * Activa o desactiva el resaltado al hover
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    // Si se está desactivando, limpiar el highlight actual
    if (!enabled && this.currentHoveredId) {
      this.clearCurrentHover();
    }
  }

  /**
   * Establece elementos que deben ser ignorados por el hover
   * @param elementIds IDs de elementos a excluir
   */
  setExcludedElements(elementIds: number[]): void {
    this.excludedElementIds = new Set(elementIds);
  }

  /**
   * Establece un callback para cuando cambia el elemento sobre el que está el puntero
   */
  setHoverCallback(callback: ((modelId: string, localId: number) => void) | null): void {
    this.onHoverCallback = callback;
  }

  /**
   * Actualiza las coordenadas del puntero
   */
  private updatePointer(event: MouseEvent): void {
    // Obtener las dimensiones del contenedor
    const rect = this.world.domElement.getBoundingClientRect();
    
    // Calcular coordenadas normalizadas (-1 a 1)
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Limpia el highlight del elemento actual
   */
  private clearCurrentHover(): void {
    if (this.currentHoveredId) {
      const model = this.fragments.find(m => m.id === this.currentHoveredId?.modelId);
      if (model) {
        model.resetHighlight([this.currentHoveredId.localId]);
      }
      this.currentHoveredId = null;
    }
  }

  /**
   * Realiza el raycast y actualiza el elemento resaltado
   */
  private async performRaycast(): Promise<void> {
    if (!this.enabled || !this.fragments) return;

    // Actualizar el raycaster con la posición del puntero
    this.raycaster.setFromCamera(this.pointer, this.world.camera);
    
    // Realizar el raycast
    try {
      const result = await this.fragments.castRay(this.raycaster.ray);
      
      // Si no hay intersección, limpiar el hover actual
      if (!result) {
        this.clearCurrentHover();
        return;
      }
      
      const { modelID, fragment, faceIndex } = result;
      
      // Obtener el modelo correspondiente
      const model = this.fragments.find(m => m.id === modelID);
      if (!model) {
        this.clearCurrentHover();
        return;
      }
      
      // Obtener el ID local del elemento
      const itemID = fragment.items?.[faceIndex];
      if (itemID === undefined) {
        this.clearCurrentHover();
        return;
      }
      
      // Verificar si este elemento está excluido
      if (this.excludedElementIds.has(itemID)) {
        this.clearCurrentHover();
        return;
      }
      
      // Si es el mismo elemento que ya estaba resaltado, no hacer nada
      if (this.currentHoveredId?.modelId === modelID && this.currentHoveredId?.localId === itemID) {
        return;
      }
      
      // Limpiar el highlight anterior
      this.clearCurrentHover();
      
      // Actualizar el elemento actual
      this.currentHoveredId = { modelId: modelID, localId: itemID };
      
      // Aplicar el highlight
      await model.highlight([itemID], this.hoverMaterial);
      
      // Llamar al callback si existe
      if (this.onHoverCallback) {
        this.onHoverCallback(modelID, itemID);
      }
      
    } catch (error) {
      console.warn("Error en el raycast para hover:", error);
      this.clearCurrentHover();
    }
  }

  /**
   * Añade los event listeners necesarios
   */
  private addEventListeners(): void {
    // Mover el mouse
    this.world.domElement.addEventListener('mousemove', (event) => {
      this.updatePointer(event);
      this.performRaycast();
    });
    
    // Cuando el mouse sale del canvas
    this.world.domElement.addEventListener('mouseleave', () => {
      this.clearCurrentHover();
    });
  }
}

/**
 * Clase para crear un cursor circular personalizado
 */
export class CustomCursor {
  private container: HTMLElement;
  private cursorElement: HTMLElement | null = null;
  private enabled: boolean = false;
  private size: number = 20;
  private color: string = 'rgba(59, 154, 255, 0.3)';
  private borderColor: string = 'rgba(59, 154, 255, 0.8)';
  private borderWidth: number = 2;
  
  constructor(container: HTMLElement) {
    this.container = container;
  }
  
  /**
   * Inicializa el cursor personalizado
   */
  initialize(): void {
    // Crear el elemento del cursor
    this.cursorElement = document.createElement('div');
    this.cursorElement.classList.add('custom-cursor');
    this.cursorElement.style.position = 'absolute';
    this.cursorElement.style.pointerEvents = 'none'; // Para que no interfiera con los eventos
    this.cursorElement.style.zIndex = '1000';
    this.cursorElement.style.width = `${this.size}px`;
    this.cursorElement.style.height = `${this.size}px`;
    this.cursorElement.style.borderRadius = '50%';
    this.cursorElement.style.backgroundColor = this.color;
    this.cursorElement.style.border = `${this.borderWidth}px solid ${this.borderColor}`;
    this.cursorElement.style.transform = 'translate(-50%, -50%)';
    this.cursorElement.style.display = 'none';
    
    // Añadir al contenedor
    this.container.appendChild(this.cursorElement);
    
    // Añadir event listeners
    this.addEventListeners();
  }
  
  /**
   * Configura el aspecto del cursor
   */
  configure(options: {
    size?: number;
    color?: string;
    borderColor?: string;
    borderWidth?: number;
  }): void {
    if (!this.cursorElement) return;
    
    if (options.size !== undefined) {
      this.size = options.size;
      this.cursorElement.style.width = `${this.size}px`;
      this.cursorElement.style.height = `${this.size}px`;
    }
    
    if (options.color !== undefined) {
      this.color = options.color;
      this.cursorElement.style.backgroundColor = this.color;
    }
    
    if (options.borderColor !== undefined) {
      this.borderColor = options.borderColor;
      this.updateBorder();
    }
    
    if (options.borderWidth !== undefined) {
      this.borderWidth = options.borderWidth;
      this.updateBorder();
    }
  }
  
  private updateBorder(): void {
    if (!this.cursorElement) return;
    this.cursorElement.style.border = `${this.borderWidth}px solid ${this.borderColor}`;
  }
  
  /**
   * Activa o desactiva el cursor personalizado
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!this.cursorElement) return;
    
    if (enabled) {
      this.cursorElement.style.display = 'block';
      this.container.style.cursor = 'none'; // Ocultar el cursor normal
    } else {
      this.cursorElement.style.display = 'none';
      this.container.style.cursor = 'auto'; // Restaurar el cursor normal
    }
  }
  
  /**
   * Añade los event listeners necesarios
   */
  private addEventListeners(): void {
    // Mover el cursor
    this.container.addEventListener('mousemove', (event) => {
      if (!this.enabled || !this.cursorElement) return;
      
      const rect = this.container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      this.cursorElement.style.left = `${x}px`;
      this.cursorElement.style.top = `${y}px`;
    });
    
    // Cuando el mouse entra en el contenedor
    this.container.addEventListener('mouseenter', () => {
      if (!this.enabled || !this.cursorElement) return;
      this.cursorElement.style.display = 'block';
    });
    
    // Cuando el mouse sale del contenedor
    this.container.addEventListener('mouseleave', () => {
      if (!this.cursorElement) return;
      this.cursorElement.style.display = 'none';
    });
  }
}

/**
 * Función de ayuda para inicializar ambas características en un visor
 */
export const setupViewerInteractions = (
  world: OBC.World, 
  fragments: FRAGS.FragmentsModels,
  options: {
    enableHover?: boolean;
    enableCustomCursor?: boolean;
    hoverMaterial?: HighlightMaterial;
    cursorSize?: number;
    cursorColor?: string;
    cursorBorderColor?: string;
    cursorBorderWidth?: number;
  } = {}
): { hoverHighlighter: HoverHighlighter | null; customCursor: CustomCursor | null } => {
  const result: { 
    hoverHighlighter: HoverHighlighter | null; 
    customCursor: CustomCursor | null 
  } = {
    hoverHighlighter: null,
    customCursor: null
  };
  
  // Inicializar el highlighter para hover
  if (options.enableHover !== false) {
    const material = options.hoverMaterial || hoverHighlightMaterial;
    result.hoverHighlighter = new HoverHighlighter(world, fragments, material);
    result.hoverHighlighter.setEnabled(true);
  }
  
  // Inicializar el cursor personalizado
  if (options.enableCustomCursor !== false) {
    result.customCursor = new CustomCursor(world.domElement);
    result.customCursor.initialize();
    
    // Configurar el cursor si se proporcionaron opciones
    const cursorOptions: any = {};
    if (options.cursorSize !== undefined) cursorOptions.size = options.cursorSize;
    if (options.cursorColor !== undefined) cursorOptions.color = options.cursorColor;
    if (options.cursorBorderColor !== undefined) cursorOptions.borderColor = options.cursorBorderColor;
    if (options.cursorBorderWidth !== undefined) cursorOptions.borderWidth = options.cursorBorderWidth;
    
    if (Object.keys(cursorOptions).length > 0) {
      result.customCursor.configure(cursorOptions);
    }
    
    result.customCursor.setEnabled(true);
  }
  
  return result;
};

export default {
  defaultHighlightMaterial,
  errorHighlightMaterial,
  tempHighlightMaterial,
  hoverHighlightMaterial,
  highlightElement,
  resetHighlight,
  highlightMultipleElements,
  resetMultipleHighlights,
  highlightElementsByCategory,
  highlightCategoryAcrossModels,
  HoverHighlighter,
  CustomCursor,
  setupViewerInteractions
};