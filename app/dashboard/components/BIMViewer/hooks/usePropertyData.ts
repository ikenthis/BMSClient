// hooks/usePropertyData.ts
import { useState, useEffect } from 'react';
import * as FRAGS from '@thatopen/fragments';

interface UsePropertyDataProps {
  selectedItem: { model: FRAGS.FragmentsModel; localId: number } | null;
  fragments: FRAGS.FragmentsModels | null;
}

/**
 * Hook para cargar y formatear los datos de propiedades del elemento seleccionado
 */
export const usePropertyData = ({ selectedItem, fragments }: UsePropertyDataProps) => {
  const [propertyData, setPropertyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedItem || !fragments) {
      setPropertyData(null);
      return;
    }

    const fetchItemData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { model, localId } = selectedItem;

        // Cargar datos básicos y property sets
        const [data] = await model.getItemsData([localId], {
          attributesDefault: true, // Obtener todos los atributos básicos
          attributes: ["Name", "GlobalId", "ObjectType", "PredefinedType", "Description"],
          relations: {
            // Cargar PropertySets (relación IsDefinedBy en IFC)
            IsDefinedBy: { 
              attributes: true, 
              relations: true 
            },
            // Puedes añadir más relaciones según necesites
            ContainedInStructure: { 
              attributes: true,
              relations: false
            },
            // Relación con Tipo (si existe)
            IsTypedBy: {
              attributes: true,
              relations: false
            }
          }
        });

        // Cargar geometría y propiedades calculadas (si están disponibles)
        let geometryData = {};
        try {
          // Nota: estos métodos pueden no estar disponibles en todos los modelos
          // por lo que los envolvemos en un try/catch separado
          if (model.getGeometryProperties) {
            const geometry = await model.getGeometryProperties([localId]);
            if (geometry && geometry.length > 0) {
              geometryData = {
                area: geometry[0].area,
                volume: geometry[0].volume,
                dimensions: geometry[0].dimensions
              };
            }
          }
        } catch (geomError) {
          console.warn("No se pudieron cargar propiedades geométricas:", geomError);
        }

        // Combinar todos los datos
        const fullData = {
          ...data,
          geometry: geometryData
        };

        setPropertyData(fullData);
      } catch (err) {
        console.error("Error al cargar datos del elemento:", err);
        setError("Error al cargar datos del elemento. Inténtelo de nuevo.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchItemData();
  }, [selectedItem, fragments]);

  // Función para extraer y formatear los property sets
  const formatPropertySets = () => {
    if (!propertyData || !propertyData.IsDefinedBy) {
      return {};
    }

    const result: Record<string, Record<string, any>> = {};
    
    // Iterar sobre todos los property sets relacionados
    for (const pset of propertyData.IsDefinedBy) {
      // Verificar que tenga nombre y propiedades
      if (!pset.Name || !pset.HasProperties) continue;
      
      const psetName = typeof pset.Name === 'object' ? pset.Name.value : pset.Name;
      const props: Record<string, any> = {};
      
      // Iterar sobre las propiedades del property set
      for (const prop of pset.HasProperties) {
        if (!prop.Name || !prop.NominalValue) continue;
        
        const propName = typeof prop.Name === 'object' ? prop.Name.value : prop.Name;
        const propValue = typeof prop.NominalValue === 'object' ? prop.NominalValue.value : prop.NominalValue;
        
        props[propName] = propValue;
      }
      
      // Solo añadir property sets con propiedades
      if (Object.keys(props).length > 0) {
        result[psetName] = props;
      }
    }
    
    return result;
  };

  // Función para extraer atributos básicos
  const extractBasicAttributes = () => {
    if (!propertyData) {
      return {};
    }
    
    // Mapear los atributos básicos que nos interesan
    const attributes: Record<string, any> = {};
    
    // Iterar sobre todas las propiedades del objeto propertyData
    for (const [key, value] of Object.entries(propertyData)) {
      // Ignorar propiedades que son arrays (suelen ser relaciones)
      if (Array.isArray(value)) continue;
      
      // Para propiedades tipo objeto con "value" (formato típico de Fragments)
      if (value && typeof value === 'object' && 'value' in value) {
        attributes[key] = value.value;
      } 
      // Para propiedades tipo objeto complejas, solo incluimos las que nos interesan
      else if (key === 'geometry') {
        attributes[key] = value;
      }
    }
    
    return attributes;
  };

  return {
    propertyData,
    isLoading,
    error,
    formatPropertySets,
    extractBasicAttributes
  };
};