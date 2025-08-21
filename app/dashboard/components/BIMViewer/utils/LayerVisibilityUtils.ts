"use client";

import * as FRAGS from '@thatopen/fragments';

// Tipo para especialidades de IFC
export type IfcSpecialty = 'ARCHITECTURE' | 'STRUCTURE' | 'MEP' | 'SITE';

// Mapeo de categorías IFC a especialidades
export const IFC_CATEGORY_SPECIALTIES: Record<IfcSpecialty, string[]> = {
  // Arquitectura
  ARCHITECTURE: [
    "IFCWALL",
    "IFCDOOR", 
    "IFCWINDOW",
    "IFCROOF",
    "IFCSTAIR",
    "IFCRAILING",
    "IFCFURNISHINGELEMENT",
    "IFCCURTAINWALL",
    "IFCSPACE",
    "IFCSLAB", // Puede estar en arquitectura y estructura
    "IFCCOVERING",
    "IFCANNOTATION",
    "IFCBUILDING",
    "IFCBUILDINGSTOREY",
    "IFCELEMENTQUANTITY",
    "IFCGRID",
    "IFCMATERIAL",
    "IFCMATERIALLAYER",
    "IFCMATERIALLAYERSET",
    "IFCMATERIALLAYERSETUSAGE",
    "IFCPROJECT",
    "IFCPROPERTYSET",
    "IFCPROPERTYSINGLEVALUE",
    "IFCQUANTYTYAREA",
    "IFCSTAIRFLIGHT",
    "IFCWALLSTANDARDCASE",
  ],
  
  // Estructura
  STRUCTURE: [
    "IFCBEAM",
    "IFCCOLUMN",
    "IFCFOOTING",
    "IFCPILE",
    "IFCPLATE",
    "IFCMEMBER",
    "IFCREINFORCINGBAR",
    "IFCREINFORCINGMESH",
    "IFCSLAB", // Puede estar en arquitectura y estructura
    "IFCSTRUCTURALSURFACEMEMBER",
    "IFCSTRUCTURALCURVEMEMBER"
  ],
  
  // MEP (Mechanical, Electrical, Plumbing)
  MEP: [
    "IFCFLOWFITTING",
    "IFCFLOWSEGMENT",
    "IFCFLOWTERMINAL",
    "IFCFLOWCONTROLLER",
    "IFCFLOWMOVINGDEVICE",
    "IFCFLOWSTORAGEDEVICE",
    "IFCFLOWTREATMENTDEVICE",
    "IFCDISTRIBUTIONELEMENT",
    "IFCDISTRIBUTIONPORT",
    "IFCELECTRICALELEMENT",
    "IFCELECTRICDISTRIBUTIONPOINT",
    "IFCLIGHTFIXTURE",
    "IFCBUILDINGELEMENTPROXY"
  ],
  
  // Terreno y Urbanización
  SITE: [
    "IFCSITE",
    "IFCGEOGRAPHICELEMENT",
    
  ]
};

// Nombres de especialidades en español
export const SPECIALTY_DISPLAY_NAMES: Record<IfcSpecialty, string> = {
  "ARCHITECTURE": "Arquitectura",
  "STRUCTURE": "Estructura",
  "MEP": "MEP",
  "SITE": "Terreno"
};

/**
 * Obtiene todas las categorías IFC de una especialidad específica
 * @param specialty Especialidad (ARCHITECTURE, STRUCTURE, MEP, SITE)
 * @returns Array de categorías IFC
 */
export const getCategoriesBySpecialty = (specialty: IfcSpecialty): string[] => {
  return IFC_CATEGORY_SPECIALTIES[specialty] || [];
};


/**
 * Verifica si una categoría pertenece a una especialidad
 * @param category Categoría IFC
 * @param specialty Especialidad (ARCHITECTURE, STRUCTURE, MEP, SITE)
 * @returns Verdadero si pertenece
 */
export const categoryBelongsToSpecialty = (category: string, specialty: IfcSpecialty): boolean => {
  const categories = IFC_CATEGORY_SPECIALTIES[specialty] || [];
  return categories.includes(category);
};

/**
 * Función para mostrar/ocultar elementos por especialidad
 * @param models Modelos cargados
 * @param fragments Motor de fragmentos
 * @param specialty Especialidad (ARCHITECTURE, STRUCTURE, MEP, SITE)
 * @param visible Mostrar (true) u ocultar (false)
 * @returns Promesa que se resuelve cuando se completa la operación
 */
export const toggleSpecialtyVisibility = async (
  models: FRAGS.FragmentsModel[],
  fragments: FRAGS.FragmentsModels,
  specialty: IfcSpecialty,
  visible: boolean
): Promise<boolean> => {
  if (!models || !models.length || !fragments) return false;
  
  try {
    // Obtener categorías de esta especialidad
    const categories = getCategoriesBySpecialty(specialty);
    if (!categories.length) return false;
    
    // Para cada modelo válido
    for (const model of models) {
      if (!model || !model.id || !fragments.models.list.has(model.id)) continue;
      
      // Para cada categoría de la especialidad
      for (const category of categories) {
        try {
          // Obtener elementos de esta categoría
          const items = await model.getItemsOfCategory(category);
          if (!items || !items.length) continue;
          
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
          
          // Establecer visibilidad si hay IDs válidos
          if (localIds.length > 0 && model.setVisible) {
            await model.setVisible(localIds, visible);
          }
        } catch (error) {
          console.warn(`Error al procesar categoría ${category}:`, error);
        }
      }
    }
    
    // Actualizar renderizado
    await fragments.update(true);
    return true;
  } catch (error) {
    console.error(`Error al cambiar visibilidad de especialidad ${specialty}:`, error);
    return false;
  }
};

/**
 * Obtiene el estado actual de visibilidad de una especialidad
 * @param models Modelos cargados
 * @param specialty Especialidad (ARCHITECTURE, STRUCTURE, MEP, SITE)
 * @returns Estado de visibilidad (true si al menos el 50% de los elementos son visibles)
 */
export const getSpecialtyVisibilityState = async (
  models: FRAGS.FragmentsModel[],
  specialty: IfcSpecialty
): Promise<boolean> => {
  if (!models || !models.length) return true;
  
  try {
    const categories = getCategoriesBySpecialty(specialty);
    if (!categories.length) return true;
    
    let totalElements = 0;
    let visibleElements = 0;
    
    // Para cada modelo válido
    for (const model of models) {
      if (!model) continue;
      
      // Para cada categoría de la especialidad
      for (const category of categories) {
        try {
          // Obtener elementos de esta categoría
          const items = await model.getItemsOfCategory(category);
          if (!items || !items.length) continue;
          
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
          
          // Verificar visibilidad si hay IDs válidos
          if (localIds.length > 0 && model.getVisible) {
            const visibilityStates = await model.getVisible(localIds);
            totalElements += localIds.length;
            visibleElements += visibilityStates.filter(state => state).length;
          }
        } catch (error) {
          console.warn(`Error al verificar visibilidad de categoría ${category}:`, error);
        }
      }
    }
    
    // Si no hay elementos, consideramos que están visibles
    if (totalElements === 0) return true;
    
    // Si al menos el 50% de los elementos están visibles, consideramos que la especialidad está visible
    return (visibleElements / totalElements) >= 0.5;
  } catch (error) {
    console.error(`Error al obtener estado de visibilidad de especialidad ${specialty}:`, error);
    return true;
  }
};

export default {
  IFC_CATEGORY_SPECIALTIES,
  SPECIALTY_DISPLAY_NAMES,
  getCategoriesBySpecialty,
  categoryBelongsToSpecialty,
  toggleSpecialtyVisibility,
  getSpecialtyVisibilityState
};