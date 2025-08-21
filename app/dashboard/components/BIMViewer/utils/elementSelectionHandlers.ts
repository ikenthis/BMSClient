//elementSelectionHandlers.ts

"use client";

import { useState } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as THREE from 'three';
import { highlightElement, resetHighlight } from './highlightUtils';

export interface SelectedItemType {
  model: FRAGS.FragmentsModel;
  localId: number;
}

export interface ElementSelectionProps {
  fragments: FRAGS.FragmentsModels | null;
  onItemSelected?: (item: SelectedItemType | null) => void;
}

export function useElementSelectionHandlers({
  fragments, 
  onItemSelected
}: ElementSelectionProps) {
  // Estados para el panel de propiedades y selección
  const [selectedItem, setSelectedItem] = useState<SelectedItemType | null>(null);
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [selectedItemData, setSelectedItemData] = useState<any>(null);
  const [formattedPsets, setFormattedPsets] = useState<Record<string, Record<string, any>>>({});
  const [showToolbar, setShowToolbar] = useState(true);
  const [previousHighlight, setPreviousHighlight] = useState<SelectedItemType | null>(null);

  // Definimos el material de resaltado
  const highlightMaterial: FRAGS.MaterialDefinition = {
    color: new THREE.Color("dodgerblue"),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 1,
    transparent: false,
  };

  // Función para obtener los atributos básicos de un elemento
  const getAttributes = async (model: FRAGS.FragmentsModel, localId: number, attributes?: string[]) => {
    if (!localId) return null;
    try {
      const [data] = await model.getItemsData([localId], {
        attributesDefault: !attributes,
        attributes,
      });
      return data;
    } catch (error) {
      console.error("Error obteniendo atributos:", error);
      return null;
    }
  };

  // Función para obtener los conjuntos de propiedades (Property Sets) de un elemento
  const getItemPropertySets = async (model: FRAGS.FragmentsModel, localId: number) => {
    if (!localId) return null;
    try {
      const [data] = await model.getItemsData([localId], {
        attributesDefault: false,
        attributes: ["Name", "NominalValue"],
        relations: {
          IsDefinedBy: { attributes: true, relations: true },
          DefinesOcurrence: { attributes: false, relations: false },
        },
      });
      return (data.IsDefinedBy || []);
    } catch (error) {
      console.error("Error obteniendo property sets:", error);
      return [];
    }
  };

  // Función para formatear los conjuntos de propiedades a un formato más amigable
  // Función para formatear los conjuntos de propiedades a un formato más amigable
const formatItemPsets = (rawPsets: any[]) => {
    const result: Record<string, Record<string, any>> = {};
    
    if (!rawPsets || !Array.isArray(rawPsets)) {
      return result;
    }
    
    for (const [_, pset] of (rawPsets || []).entries()) {
      // Verificar que pset y sus propiedades existen
      if (!pset || !pset.Name || !pset.HasProperties) continue;
      
      const { Name: psetName, HasProperties } = pset;
      
      // Verificar que psetName tiene value y HasProperties es un array
      if (!psetName || typeof psetName !== 'object' || !('value' in psetName) || !Array.isArray(HasProperties)) continue;
      
      const props: Record<string, any> = {};
      
      for (const [_, prop] of HasProperties.entries()) {
        // Verificar que prop y sus propiedades existen
        if (!prop || !prop.Name || !prop.NominalValue) continue;
        
        const { Name, NominalValue } = prop;
        
        // Verificar que Name y NominalValue tienen value
        if (!Name || typeof Name !== 'object' || !('value' in Name) || 
            !NominalValue || typeof NominalValue !== 'object' || !('value' in NominalValue)) continue;
        
        const name = Name.value;
        const nominalValue = NominalValue.value;
        
        if (!(name && nominalValue !== undefined)) continue;
        props[name] = nominalValue;
      }
      
      // Solo agregar el pset si tiene propiedades
      if (Object.keys(props).length > 0) {
        result[psetName.value] = props;
      }
    }
    
    return result;
  };

  // Función para resaltar un elemento
  const highlightSelectedElement = async (item: SelectedItemType | null) => {
    if (!item) return;
    
    // Si teníamos un elemento resaltado anteriormente, lo quitamos
    if (previousHighlight) {
      try {
        await resetHighlight(previousHighlight.model, previousHighlight.localId);
      } catch (error) {
        console.warn("Error al quitar resaltado:", error);
      }
    }
    
    // Resaltar el nuevo elemento
    try {
      await highlightElement(item.model, item.localId, highlightMaterial);
      setPreviousHighlight(item);
      
      // Actualizar el fragmento para que se vean los cambios
      if (fragments) {
        await fragments.update(true);
      }
    } catch (error) {
      console.warn("Error al resaltar elemento:", error);
    }
  };

  // Función para seleccionar elemento (sin mostrar panel de propiedades)
  const selectElement = async (item: SelectedItemType | null) => {
    if (!item) {
      setSelectedItem(null);
      
      // Si había un elemento resaltado, quitar el resaltado
      if (previousHighlight) {
        try {
          await resetHighlight(previousHighlight.model, previousHighlight.localId);
          setPreviousHighlight(null);
          
          // Actualizar el fragmento
          if (fragments) {
            await fragments.update(true);
          }
        } catch (error) {
          console.warn("Error al quitar resaltado:", error);
        }
      }
      return;
    }

    // Actualizar el elemento seleccionado
    setSelectedItem(item);
    
    // Resaltar el elemento
    await highlightSelectedElement(item);
    
    // Notificar al componente padre si existe
    if (onItemSelected) {
      onItemSelected(item);
    }
  };

  // Función para seleccionar elemento y mostrar sus propiedades
  const selectElementAndShowProperties = async (item: SelectedItemType | null) => {
    if (!item) {
      setSelectedItem(null);
      setSelectedItemData(null);
      setFormattedPsets({});
      setShowPropertyPanel(false);
      setShowToolbar(true);
      
      // Si había un elemento resaltado, quitar el resaltado
      if (previousHighlight) {
        try {
          await resetHighlight(previousHighlight.model, previousHighlight.localId);
          setPreviousHighlight(null);
          
          // Actualizar el fragmento
          if (fragments) {
            await fragments.update(true);
          }
        } catch (error) {
          console.warn("Error al quitar resaltado:", error);
        }
      }
      return;
    }

    // Actualizar el elemento seleccionado
    setSelectedItem(item);
    
    // Resaltar el elemento
    await highlightSelectedElement(item);
    
    try {
      const { model, localId } = item;
      
      // Obtener datos básicos del elemento
      const basicData = await getAttributes(model, localId, [
        "Name", "GlobalId", "ObjectType", "PredefinedType", "Description"
      ]);
      
      // Obtener los conjuntos de propiedades
      const rawPsets = await getItemPropertySets(model, localId);
      
      // Formatear los conjuntos de propiedades
      const psets = formatItemPsets(rawPsets);
      
      // Guardar los datos
      setSelectedItemData(basicData);
      setFormattedPsets(psets);
      setShowPropertyPanel(true);
      
      // Ocultar toolbar cuando se muestra el panel de propiedades
      setShowToolbar(false);
      
    } catch (error) {
      console.error("Error al cargar datos del elemento:", error);
    }
  };

  const handleTogglePropertyPanel = (show: boolean) => {
    if (show !== showPropertyPanel) {
      setShowPropertyPanel(show);
      // Mostrar/ocultar toolbar según el estado del panel
      setShowToolbar(!show);
    }
  };

  // Función para cerrar el panel de propiedades 
  const handleClosePropertyPanel = () => {
    setShowPropertyPanel(false);
    setShowToolbar(true);
  };

  return {
    selectedItem,
    showPropertyPanel,
    selectedItemData,
    formattedPsets,
    showToolbar,
    setShowToolbar,
    setSelectedItem,
    setShowPropertyPanel,
    setSelectedItemData,
    setFormattedPsets,
    highlightSelectedElement,
    selectElement,
    selectElementAndShowProperties,
    handleTogglePropertyPanel,
    handleClosePropertyPanel
  };
}

export default useElementSelectionHandlers;