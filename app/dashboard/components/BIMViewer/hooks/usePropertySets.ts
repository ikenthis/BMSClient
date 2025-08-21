// hooks/usePropertySets.ts
import { useState, useCallback } from 'react';

interface PropertySet {
  name: string;
  properties: Record<string, any>;
}

interface PropertySetsResult {
  propertysets: PropertySet[];
  loading: boolean;
  error: string | null;
}

export const usePropertySets = () => {
  const [result, setResult] = useState<PropertySetsResult>({
    propertysets: [],
    loading: false,
    error: null
  });
  
  const extractPropertySets = useCallback(async (model: any, elementId: number) => {
    if (!model || elementId === undefined) {
      setResult({
        propertysets: [],
        loading: false,
        error: "Modelo o ID de elemento no válido"
      });
      return null;
    }
    
    try {
      setResult(prev => ({ ...prev, loading: true, error: null }));
      
      // Obtener datos completos del elemento
      const [itemData] = await model.getItemsData([elementId], {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true },
          ContainedInStructure: { attributes: true, relations: false }
        }
      });
      
      // Procesar property sets
      if (itemData.IsDefinedBy && Array.isArray(itemData.IsDefinedBy)) {
        const formattedPropertySets = itemData.IsDefinedBy.map(pset => {
          if (pset.Name && pset.Name.value) {
            const psetName = pset.Name.value;
            const properties: Record<string, any> = {};
            
            if (pset.HasProperties && Array.isArray(pset.HasProperties)) {
              pset.HasProperties.forEach(prop => {
                if (prop.Name && prop.Name.value && prop.NominalValue && prop.NominalValue.value !== undefined) {
                  properties[prop.Name.value] = prop.NominalValue.value;
                }
              });
            }
            
            return {
              name: psetName,
              properties
            };
          }
          return null;
        }).filter(Boolean) as PropertySet[];
        
        setResult({
          propertysets: formattedPropertySets,
          loading: false,
          error: null
        });
        
        // Devolver también los datos para uso inmediato
        return {
          elementId,
          type: itemData.ObjectType?.value || 'Unknown',
          name: itemData.Name?.value || `Element_${elementId}`,
          propertysets: formattedPropertySets
        };
      } else {
        setResult({
          propertysets: [],
          loading: false,
          error: "No se encontraron property sets para este elemento"
        });
        return null;
      }
    } catch (error) {
      console.error("Error al extraer property sets:", error);
      setResult({
        propertysets: [],
        loading: false,
        error: error instanceof Error ? error.message : "Error desconocido"
      });
      return null;
    }
  }, []);
  
  return {
    ...result,
    extractPropertySets
  };
};