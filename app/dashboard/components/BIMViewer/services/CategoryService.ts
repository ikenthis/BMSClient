// ============================================================================
// services/CategoryService.ts
// Servicio completo para el manejo de categorías IFC en modelos de fragmentos
// ============================================================================

import * as FRAGS from '@thatopen/fragments';
import { CATEGORY_DISPLAY_NAMES } from '../constants/CategoryConstants';

/**
 * Resultado de la carga de categorías de modelo
 */
export interface LoadCategoriesResult {
  categories: string[];
  visibility: Record<string, boolean>;
}

/**
 * Opciones para validar modelos
 */
export interface ModelValidationOptions {
  checkCategories?: boolean;
  checkVisibility?: boolean;
  logErrors?: boolean;
}

/**
 * Información de una categoría específica
 */
export interface CategoryInfo {
  name: string;
  displayName: string;
  itemCount: number;
  isVisible: boolean;
  models: string[]; // IDs de modelos que contienen esta categoría
}

/**
 * Estadísticas de categorías
 */
export interface CategoryStats {
  totalCategories: number;
  visibleCategories: number;
  hiddenCategories: number;
  totalItems: number;
  categoriesInfo: CategoryInfo[];
}

/**
 * Servicio para manejar operaciones relacionadas con categorías IFC
 * Proporciona métodos para cargar, mostrar/ocultar y gestionar categorías de modelos
 */
export class CategoryService {
  /**
   * Carga todas las categorías disponibles en los modelos y determina su estado de visibilidad
   * @param models Array de modelos de fragmentos
   * @param fragments Motor de fragmentos
   * @param options Opciones de validación
   * @returns Promesa con las categorías y su estado de visibilidad
   */
  static async loadModelCategories(
    models: FRAGS.FragmentsModel[],
    fragments: FRAGS.FragmentsModels,
    options: ModelValidationOptions = {}
  ): Promise<LoadCategoriesResult> {
    const { checkCategories = true, checkVisibility = true, logErrors = false } = options;
    
    if (!models || models.length === 0) {
      if (logErrors) console.warn('CategoryService: No models provided');
      return { categories: [], visibility: {} };
    }

    if (!fragments) {
      if (logErrors) console.warn('CategoryService: No fragments engine provided');
      return { categories: [], visibility: {} };
    }

    const allCategories = new Set<string>();
    const validModels = this.getValidModels(models, fragments, { logErrors });
    
    // Recopilar todas las categorías de todos los modelos válidos
    for (const model of validModels) {
      try {
        if (!model.getCategories) {
          if (logErrors) console.warn(`Model ${model.id} does not support getCategories`);
          continue;
        }
        
        const categories = await model.getCategories();
        if (Array.isArray(categories)) {
          categories.forEach(category => {
            if (category && typeof category === 'string') {
              allCategories.add(category);
            }
          });
        } else if (logErrors) {
          console.warn(`Model ${model.id} returned invalid categories format`);
        }
      } catch (error) {
        if (logErrors) {
          console.warn(`Error getting categories from model ${model.id}:`, error);
        }
      }
    }
    
    const sortedCategories = Array.from(allCategories).sort();
    
    if (!checkVisibility) {
      // Si no necesitamos verificar visibilidad, asumimos que todo está visible
      const initialVisibility: Record<string, boolean> = {};
      sortedCategories.forEach(category => {
        initialVisibility[category] = true;
      });
      return { categories: sortedCategories, visibility: initialVisibility };
    }

    // Determinar el estado de visibilidad inicial de cada categoría
    const initialVisibility = await this.getCategoriesVisibilityState(
      sortedCategories,
      validModels,
      { logErrors }
    );
    
    return { 
      categories: sortedCategories, 
      visibility: initialVisibility 
    };
  }

  /**
   * Obtiene el estado de visibilidad de todas las categorías especificadas
   * @param categories Array de nombres de categorías
   * @param models Array de modelos válidos
   * @param options Opciones de configuración
   * @returns Record con el estado de visibilidad de cada categoría
   */
  static async getCategoriesVisibilityState(
    categories: string[],
    models: FRAGS.FragmentsModel[],
    options: { logErrors?: boolean } = {}
  ): Promise<Record<string, boolean>> {
    const { logErrors = false } = options;
    const visibility: Record<string, boolean> = {};
    
    for (const category of categories) {
      try {
        const isVisible = await this.getCategoryVisibilityState(category, models, { logErrors });
        visibility[category] = isVisible;
      } catch (error) {
        if (logErrors) {
          console.warn(`Error checking visibility for category ${category}:`, error);
        }
        // En caso de error, asumimos que la categoría está visible
        visibility[category] = true;
      }
    }
    
    return visibility;
  }

  /**
   * Obtiene el estado de visibilidad de una categoría específica
   * @param category Nombre de la categoría
   * @param models Array de modelos
   * @param options Opciones de configuración
   * @returns true si la categoría está completamente visible, false si algún elemento está oculto
   */
  static async getCategoryVisibilityState(
    category: string,
    models: FRAGS.FragmentsModel[],
    options: { logErrors?: boolean } = {}
  ): Promise<boolean> {
    const { logErrors = false } = options;
    
    for (const model of models) {
      try {
        if (!model.getItemsOfCategory) continue;
        
        const items = await model.getItemsOfCategory(category);
        if (!items || items.length === 0) continue;
        
        const localIds = await this.getLocalIdsFromItems(items, { logErrors });
        if (localIds.length === 0) continue;
        
        if (model.getVisible) {
          const visibilityStates = await model.getVisible(localIds);
          // Si algún elemento no es visible, consideramos la categoría como parcialmente oculta
          if (visibilityStates.some(state => !state)) {
            return false;
          }
        }
      } catch (error) {
        if (logErrors) {
          console.warn(`Error checking category ${category} in model ${model.id}:`, error);
        }
        // En caso de error, continuamos con el siguiente modelo
      }
    }
    
    return true; // Si llegamos aquí, todos los elementos visibles están mostrados
  }

  /**
   * Cambia la visibilidad de una categoría específica
   * @param category Nombre de la categoría
   * @param newVisibility Nuevo estado de visibilidad
   * @param models Array de modelos
   * @param fragments Motor de fragmentos
   * @param options Opciones de configuración
   */
  static async toggleCategoryVisibility(
    category: string,
    newVisibility: boolean,
    models: FRAGS.FragmentsModel[],
    fragments: FRAGS.FragmentsModels,
    options: { logErrors?: boolean; forceUpdate?: boolean } = {}
  ): Promise<void> {
    const { logErrors = false, forceUpdate = true } = options;
    
    if (!category || typeof category !== 'string') {
      throw new Error('Invalid category name provided');
    }

    const validModels = this.getValidModels(models, fragments, { logErrors });
    
    if (validModels.length === 0) {
      throw new Error('No valid models found');
    }
    
    const operations: Promise<void>[] = [];
    
    for (const model of validModels) {
      const operation = this.toggleCategoryVisibilityInModel(
        category,
        newVisibility,
        model,
        { logErrors }
      );
      operations.push(operation);
    }
    
    // Ejecutar todas las operaciones en paralelo
    await Promise.allSettled(operations);
    
    // Actualizar el renderizado si se requiere
    if (forceUpdate && fragments) {
      try {
        await fragments.update(true);
      } catch (error) {
        if (logErrors) {
          console.warn('Error updating fragments after visibility change:', error);
        }
      }
    }
  }

  /**
   * Cambia la visibilidad de una categoría en un modelo específico
   * @param category Nombre de la categoría
   * @param visibility Estado de visibilidad deseado
   * @param model Modelo donde aplicar el cambio
   * @param options Opciones de configuración
   */
  static async toggleCategoryVisibilityInModel(
    category: string,
    visibility: boolean,
    model: FRAGS.FragmentsModel,
    options: { logErrors?: boolean } = {}
  ): Promise<void> {
    const { logErrors = false } = options;
    
    try {
      if (!model.getItemsOfCategory || !model.setVisible) {
        if (logErrors) {
          console.warn(`Model ${model.id} does not support required visibility methods`);
        }
        return;
      }
      
      const items = await model.getItemsOfCategory(category);
      if (!items || items.length === 0) {
        if (logErrors) {
          console.warn(`No items found for category ${category} in model ${model.id}`);
        }
        return;
      }
      
      const localIds = await this.getLocalIdsFromItems(items, { logErrors });
      if (localIds.length === 0) {
        if (logErrors) {
          console.warn(`No valid local IDs found for category ${category} in model ${model.id}`);
        }
        return;
      }
      
      await model.setVisible(localIds, visibility);
      
    } catch (error) {
      if (logErrors) {
        console.warn(`Error toggling visibility for category ${category} in model ${model.id}:`, error);
      }
      throw error;
    }
  }

  /**
   * Cambia la visibilidad de todas las categorías especificadas
   * @param categories Array de nombres de categorías
   * @param visibility Estado de visibilidad deseado
   * @param models Array de modelos
   * @param fragments Motor de fragmentos
   * @param options Opciones de configuración
   */
  static async toggleAllCategories(
    categories: string[],
    visibility: boolean,
    models: FRAGS.FragmentsModel[],
    fragments: FRAGS.FragmentsModels,
    options: { logErrors?: boolean; batchSize?: number; forceUpdate?: boolean } = {}
  ): Promise<void> {
    const { logErrors = false, batchSize = 5, forceUpdate = true } = options;
    
    const validModels = this.getValidModels(models, fragments, { logErrors });
    
    if (validModels.length === 0) {
      throw new Error('No valid models found');
    }

    // Intentar usar el método más eficiente si está disponible
    const useOptimizedMethod = validModels.every(model => 
      model.getAllIds && model.setVisible
    );

    if (useOptimizedMethod) {
      await this.toggleAllCategoriesOptimized(validModels, visibility, { logErrors });
    } else {
      await this.toggleAllCategoriesByCategory(
        categories, 
        visibility, 
        validModels, 
        { logErrors, batchSize }
      );
    }
    
    // Actualizar el renderizado si se requiere
    if (forceUpdate && fragments) {
      try {
        await fragments.update(true);
      } catch (error) {
        if (logErrors) {
          console.warn('Error updating fragments after bulk visibility change:', error);
        }
      }
    }
  }

  /**
   * Método optimizado para cambiar visibilidad usando getAllIds
   * @param models Array de modelos válidos
   * @param visibility Estado de visibilidad deseado
   * @param options Opciones de configuración
   */
  private static async toggleAllCategoriesOptimized(
    models: FRAGS.FragmentsModel[],
    visibility: boolean,
    options: { logErrors?: boolean } = {}
  ): Promise<void> {
    const { logErrors = false } = options;
    
    const operations: Promise<void>[] = [];
    
    for (const model of models) {
      const operation = (async () => {
        try {
          if (!model.getAllIds || !model.setVisible) return;
          
          const allIds = await model.getAllIds();
          if (allIds && allIds.length > 0) {
            await model.setVisible(allIds, visibility);
          }
        } catch (error) {
          if (logErrors) {
            console.warn(`Error in optimized visibility toggle for model ${model.id}:`, error);
          }
        }
      })();
      
      operations.push(operation);
    }
    
    await Promise.allSettled(operations);
  }

  /**
   * Método para cambiar visibilidad procesando por categorías
   * @param categories Array de categorías
   * @param visibility Estado de visibilidad deseado
   * @param models Array de modelos válidos
   * @param options Opciones de configuración
   */
  private static async toggleAllCategoriesByCategory(
    categories: string[],
    visibility: boolean,
    models: FRAGS.FragmentsModel[],
    options: { logErrors?: boolean; batchSize?: number } = {}
  ): Promise<void> {
    const { logErrors = false, batchSize = 5 } = options;
    
    // Procesar categorías en lotes para evitar sobrecarga
    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      const batchOperations: Promise<void>[] = [];
      
      for (const category of batch) {
        for (const model of models) {
          const operation = this.toggleCategoryVisibilityInModel(
            category,
            visibility,
            model,
            { logErrors }
          ).catch(() => {
            // Ignorar errores individuales en operaciones en lote
          });
          
          batchOperations.push(operation);
        }
      }
      
      await Promise.allSettled(batchOperations);
    }
  }

  /**
   * Obtiene estadísticas detalladas de las categorías
   * @param models Array de modelos
   * @param fragments Motor de fragmentos
   * @param options Opciones de configuración
   * @returns Estadísticas completas de categorías
   */
  static async getCategoryStats(
    models: FRAGS.FragmentsModel[],
    fragments: FRAGS.FragmentsModels,
    options: { logErrors?: boolean; includeItemCounts?: boolean } = {}
  ): Promise<CategoryStats> {
    const { logErrors = false, includeItemCounts = true } = options;
    
    const result = await this.loadModelCategories(models, fragments, { 
      checkVisibility: true, 
      logErrors 
    });
    
    const categoriesInfo: CategoryInfo[] = [];
    let totalItems = 0;
    
    if (includeItemCounts) {
      for (const category of result.categories) {
        try {
          const info = await this.getCategoryInfo(category, models, { logErrors });
          categoriesInfo.push(info);
          totalItems += info.itemCount;
        } catch (error) {
          if (logErrors) {
            console.warn(`Error getting info for category ${category}:`, error);
          }
        }
      }
    } else {
      // Solo crear info básica sin contar elementos
      for (const category of result.categories) {
        categoriesInfo.push({
          name: category,
          displayName: this.getCategoryDisplayName(category),
          itemCount: 0,
          isVisible: result.visibility[category] ?? true,
          models: []
        });
      }
    }
    
    const visibleCategories = Object.values(result.visibility).filter(v => v).length;
    
    return {
      totalCategories: result.categories.length,
      visibleCategories,
      hiddenCategories: result.categories.length - visibleCategories,
      totalItems,
      categoriesInfo
    };
  }

  /**
   * Obtiene información detallada de una categoría específica
   * @param category Nombre de la categoría
   * @param models Array de modelos
   * @param options Opciones de configuración
   * @returns Información detallada de la categoría
   */
  static async getCategoryInfo(
    category: string,
    models: FRAGS.FragmentsModel[],
    options: { logErrors?: boolean } = {}
  ): Promise<CategoryInfo> {
    const { logErrors = false } = options;
    
    let itemCount = 0;
    const modelIds: string[] = [];
    
    for (const model of models) {
      try {
        if (!model.getItemsOfCategory) continue;
        
        const items = await model.getItemsOfCategory(category);
        if (items && items.length > 0) {
          itemCount += items.length;
          if (model.id) {
            modelIds.push(model.id);
          }
        }
      } catch (error) {
        if (logErrors) {
          console.warn(`Error getting items for category ${category} in model ${model.id}:`, error);
        }
      }
    }
    
    const isVisible = await this.getCategoryVisibilityState(category, models, { logErrors });
    
    return {
      name: category,
      displayName: this.getCategoryDisplayName(category),
      itemCount,
      isVisible,
      models: modelIds
    };
  }

  /**
   * Obtiene los IDs locales de un array de elementos
   * @param items Array de elementos IFC
   * @param options Opciones de configuración
   * @returns Array de IDs locales válidos
   */
  private static async getLocalIdsFromItems(
    items: any[],
    options: { logErrors?: boolean } = {}
  ): Promise<number[]> {
    const { logErrors = false } = options;
    const localIds: number[] = [];
    
    for (const item of items) {
      if (!item || !item.getLocalId) continue;
      
      try {
        const localId = await item.getLocalId();
        if (localId !== null && localId !== undefined && typeof localId === 'number') {
          localIds.push(localId);
        }
      } catch (error) {
        if (logErrors) {
          console.warn('Error getting local ID from item:', error);
        }
      }
    }
    
    return localIds;
  }

  /**
   * Filtra y devuelve solo los modelos válidos que están registrados en el motor de fragmentos
   * @param models Array de modelos
   * @param fragments Motor de fragmentos
   * @param options Opciones de configuración
   * @returns Array de modelos válidos
   */
  private static getValidModels(
    models: FRAGS.FragmentsModel[],
    fragments: FRAGS.FragmentsModels,
    options: { logErrors?: boolean } = {}
  ): FRAGS.FragmentsModel[] {
    const { logErrors = false } = options;
    const validModels: FRAGS.FragmentsModel[] = [];
    
    for (const model of models) {
      if (!model) {
        if (logErrors) console.warn('Null or undefined model found');
        continue;
      }
      
      try {
        // Verificar que el modelo esté registrado en el motor de fragmentos
        if (model.id && fragments.models.list.has(model.id)) {
          validModels.push(model);
        } else if (logErrors) {
          console.warn(`Model ${model.id || 'unknown'} is not registered in fragments engine`);
        }
      } catch (error) {
        if (logErrors) {
          console.warn(`Error validating model ${model.id || 'unknown'}:`, error);
        }
      }
    }
    
    return validModels;
  }

  /**
   * Obtiene el nombre legible para mostrar de una categoría
   * @param category Nombre técnico de la categoría IFC
   * @returns Nombre legible o el nombre original si no hay traducción
   */
  static getCategoryDisplayName(category: string): string {
    if (!category || typeof category !== 'string') {
      return 'Categoría desconocida';
    }
    
    return CATEGORY_DISPLAY_NAMES[category.toUpperCase()] || category;
  }

  /**
   * Obtiene todas las categorías únicas de todos los modelos
   * @param models Array de modelos
   * @param options Opciones de configuración
   * @returns Array de nombres de categorías únicos
   */
  static async getAllUniqueCategories(
    models: FRAGS.FragmentsModel[],
    options: { logErrors?: boolean; sorted?: boolean } = {}
  ): Promise<string[]> {
    const { logErrors = false, sorted = true } = options;
    const allCategories = new Set<string>();
    
    for (const model of models) {
      try {
        if (!model.getCategories) continue;
        
        const categories = await model.getCategories();
        if (Array.isArray(categories)) {
          categories.forEach(category => {
            if (category && typeof category === 'string') {
              allCategories.add(category);
            }
          });
        }
      } catch (error) {
        if (logErrors) {
          console.warn(`Error getting categories from model ${model.id}:`, error);
        }
      }
    }
    
    const categoriesArray = Array.from(allCategories);
    return sorted ? categoriesArray.sort() : categoriesArray;
  }

  /**
   * Verifica si una categoría específica existe en algún modelo
   * @param category Nombre de la categoría
   * @param models Array de modelos
   * @returns true si la categoría existe en al menos un modelo
   */
  static async categoryExists(
    category: string,
    models: FRAGS.FragmentsModel[]
  ): Promise<boolean> {
    for (const model of models) {
      try {
        if (!model.getItemsOfCategory) continue;
        
        const items = await model.getItemsOfCategory(category);
        if (items && items.length > 0) {
          return true;
        }
      } catch (error) {
        // Ignorar errores y continuar
      }
    }
    
    return false;
  }

  /**
   * Filtra categorías por un término de búsqueda
   * @param categories Array de categorías
   * @param searchTerm Término de búsqueda
   * @param searchInDisplayName Si debe buscar también en nombres legibles
   * @returns Array de categorías filtradas
   */
  static filterCategories(
    categories: string[],
    searchTerm: string,
    searchInDisplayName: boolean = true
  ): string[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return categories;
    }
    
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    return categories.filter(category => {
      const categoryMatch = category.toLowerCase().includes(normalizedSearchTerm);
      
      if (searchInDisplayName) {
        const displayName = this.getCategoryDisplayName(category).toLowerCase();
        const displayNameMatch = displayName.includes(normalizedSearchTerm);
        return categoryMatch || displayNameMatch;
      }
      
      return categoryMatch;
    });
  }
}