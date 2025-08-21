// hooks/useModelExtractor.ts
import { useState, useCallback } from 'react';
import axios from 'axios';
import { API_URL_BIM } from '@/server'; // Ajusta la ruta de importación según tu proyecto
import * as FRAGS from '@thatopen/fragments';
import { PSet } from '../types';

interface UseModelExtractorProps {
  onProgress?: (percent: number, message: string) => void;
  onComplete?: (elementCount: number) => void;
  onError?: (error: Error) => void;
}

// Definir interfaces para tipos de datos
interface PropertySet {
  name: string;
  properties: Record<string, any>;
}

// Función para comprobar si es un atributo con value
function isItemAttribute(item: any): item is { value: any } {
  return item && typeof item === 'object' && 'value' in item;
}

export const useModelExtractor = ({
  onProgress,
  onComplete,
  onError
}: UseModelExtractorProps) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Función para extraer datos de un modelo y guardarlos en MongoDB
  const extractModelData = useCallback(async (
    model: FRAGS.FragmentsModel, 
    modelId: string
  ) => {
    if (!model || !modelId) {
      if (onError) onError(new Error('Se requiere modelo y modelId'));
      return false;
    }
    
    setIsExtracting(true);
    setProgress(0);
    
    try {
      if (onProgress) onProgress(5, "Obteniendo categorías del modelo...");
      
      // 1. Obtener todas las categorías del modelo
      const categories = await model.getCategories();
      
      if (onProgress) onProgress(10, `Encontradas ${categories.length} categorías`);
      
      // Array para almacenar todos los elementos extraídos
      const allElements = [];
      
      // 2. Procesar cada categoría
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const progressPercent = 10 + Math.floor((i / categories.length) * 60);
        
        if (onProgress) onProgress(progressPercent, `Procesando categoría: ${category} (${i+1}/${categories.length})`);
        
        try {
          // Obtener elementos de esta categoría
          const categoryItems = await model.getItemsOfCategory(category);
          
          // Procesar elementos en lotes
          const batchSize = 50;
          for (let j = 0; j < categoryItems.length; j += batchSize) {
            const batch = categoryItems.slice(j, Math.min(j + batchSize, categoryItems.length));
            
            // Procesar cada elemento del lote
            const batchPromises = batch.map(async (item) => {
              try {
                const localId = await item.getLocalId();
                if (localId === null) return null;
                
                // Obtener datos completos del elemento
                const [elementData] = await model.getItemsData([localId], {
                  attributesDefault: true,
                  relations: {
                    IsDefinedBy: { attributes: true, relations: true },
                    ContainedInStructure: { attributes: true, relations: false }
                  }
                });
                
                // Extraer nombre y tipo con guardas de tipo
                let name = `Element_${localId}`;
                if (elementData.Name && !Array.isArray(elementData.Name) && isItemAttribute(elementData.Name)) {
                  name = elementData.Name.value || name;
                }
                
                let type = category;
                if (elementData.ObjectType && !Array.isArray(elementData.ObjectType) && isItemAttribute(elementData.ObjectType)) {
                  type = elementData.ObjectType.value || type;
                }
                
                // Extraer nivel (si está disponible)
                let level = '';
                if (elementData.ContainedInStructure && 
                    Array.isArray(elementData.ContainedInStructure) && 
                    elementData.ContainedInStructure[0]?.Name && 
                    isItemAttribute(elementData.ContainedInStructure[0].Name)) {
                  level = elementData.ContainedInStructure[0].Name.value;
                }
                
                // Generar documento para MongoDB
                const elementDoc = {
                  modelId,
                  expressId: localId,
                  name,
                  type,
                  category,
                  level,
                  properties: extractProperties(elementData),
                  propertySets: extractPropertySets(elementData)
                };
                
                return elementDoc;
              } catch (itemError) {
                console.warn(`Error procesando elemento:`, itemError);
                return null;
              }
            });
            
            // Esperar a que se procesen todos los elementos del lote
            const batchResults = await Promise.all(batchPromises);
            
            // Añadir elementos válidos al array general
            allElements.push(...batchResults.filter(e => e !== null));
          }
        } catch (categoryError) {
          console.warn(`Error procesando categoría ${category}:`, categoryError);
        }
      }
      
      if (onProgress) onProgress(70, `Procesados ${allElements.length} elementos. Guardando en la base de datos...`);
      
      // 3. Guardar todos los elementos en MongoDB
      // Enviar en lotes para manejar grandes cantidades de datos
      const saveBatchSize = 500;
      for (let i = 0; i < allElements.length; i += saveBatchSize) {
        const saveBatch = allElements.slice(i, Math.min(i + saveBatchSize, allElements.length));
        const progressPercent = 70 + Math.floor((i / allElements.length) * 25);
        
        if (onProgress) onProgress(progressPercent, `Guardando elementos ${i+1}-${Math.min(i + saveBatchSize, allElements.length)} de ${allElements.length}...`);
        
        await axios.post(`${API_URL_BIM}/elements/extract/${modelId}`, {
          elements: saveBatch
        });
      }
      
      if (onProgress) onProgress(100, `Extracción completada: ${allElements.length} elementos guardados`);
      if (onComplete) onComplete(allElements.length);
      
      return true;
    } catch (error) {
      console.error("Error en extracción de datos:", error);
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      return false;
    } finally {
      setIsExtracting(false);
    }
  }, [onProgress, onComplete, onError]);
  
  return {
    extractModelData,
    isExtracting,
    progress
  };
};

// Función auxiliar para extraer propiedades planas
const extractProperties = (elementData: any): Record<string, any> => {
  const properties: Record<string, any> = {};
  
  // Filtrar propiedades que son objetos con value
  Object.entries(elementData).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
      properties[key] = value.value;
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      properties[key] = value;
    }
  });
  
  return properties;
};

// Función auxiliar para extraer property sets
const extractPropertySets = (elementData: any): PropertySet[] => {
  const propertySets: PropertySet[] = [];
  
  // Extraer IsDefinedBy (psets en IFC)
  if (elementData.IsDefinedBy && Array.isArray(elementData.IsDefinedBy)) {
    elementData.IsDefinedBy.forEach((pset: PSet) => {
      if (pset.Name && isItemAttribute(pset.Name)) {
        const psetProps: Record<string, any> = {};
        
        // Procesar propiedades si existen
        if (pset.HasProperties && Array.isArray(pset.HasProperties)) {
          pset.HasProperties.forEach(prop => {
            if (prop.Name && isItemAttribute(prop.Name) && 
                prop.NominalValue && isItemAttribute(prop.NominalValue)) {
              psetProps[prop.Name.value] = prop.NominalValue.value;
            }
          });
        }
        
        propertySets.push({
          name: pset.Name.value,
          properties: psetProps
        });
      }
    });
  }
  
  return propertySets;
};