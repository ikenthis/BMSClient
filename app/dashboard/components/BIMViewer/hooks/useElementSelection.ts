import { useEffect, useRef, useCallback, useState, RefObject } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { highlightElement, resetHighlight, defaultHighlightMaterial } from '../utils/highlightUtils';
import { SelectedItemData, FormattedItemData } from '../utils/typeDefs';

/**
 * Hook para manejar la selección de elementos mediante raycast
 */
export const useElementSelection = (
  containerRef: RefObject<HTMLDivElement>,
  world: OBC.World | null,
  fragments: FRAGS.FragmentsModels | null,
  models: FRAGS.FragmentsModel[],
  onItemSelected?: (itemData: any | null) => void
) => {
  // Estado para el elemento seleccionado
  const [selectedItem, setSelectedItem] = useState<SelectedItemData | null>(null);
  const [showPropertyPanel, setShowPropertyPanel] = useState<boolean>(false);
  const [selectedItemData, setSelectedItemData] = useState<FormattedItemData | null>(null);
  const [formattedPsets, setFormattedPsets] = useState<Record<string, Record<string, any>>>({});
  
  // Estado para el menú contextual
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    item: null as SelectedItemData | null
  });
  
  // Referencias para evitar re-renders innecesarios
  const selectedModelRef = useRef<FRAGS.FragmentsModel | null>(null);
  const selectedLocalIdRef = useRef<number | null>(null);

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
  const formatItemPsets = (rawPsets: any[]) => {
    const result: Record<string, Record<string, any>> = {};
    for (const [_, pset] of (rawPsets || []).entries()) {
      const { Name: psetName, HasProperties } = pset;
      if (!("value" in psetName && Array.isArray(HasProperties))) continue;
      const props: Record<string, any> = {};
      for (const [_, prop] of HasProperties.entries()) {
        const { Name, NominalValue } = prop;
        if (!("value" in Name && "value" in NominalValue)) continue;
        const name = Name.value;
        const nominalValue = NominalValue.value;
        if (!(name && nominalValue !== undefined)) continue;
        props[name] = nominalValue;
      }
      result[psetName.value] = props;
    }
    return result;
  };

  // Handler para elementos seleccionados
  const handleItemSelectedInternal = useCallback(async (itemData: SelectedItemData | null) => {
    console.log('Element selected:', itemData);
    
    if (itemData && itemData.model && itemData.localId !== undefined) {
      try {
        // Obtener datos básicos del elemento
        const basicData = await getAttributes(itemData.model, itemData.localId, [
          "Name", "GlobalId", "ObjectType", "PredefinedType", "Description"
        ]);
        
        // Obtener los conjuntos de propiedades
        const rawPsets = await getItemPropertySets(itemData.model, itemData.localId);
        
        // Formatear los conjuntos de propiedades
        const psets = formatItemPsets(rawPsets);
        setFormattedPsets(psets);
        
        // Crear objeto de datos formateados para la UI
        const formattedData: FormattedItemData = {
          expressId: itemData.localId,
          modelId: itemData.model.id || 'unknown',
          type: basicData?.ObjectType?.value || 'Unknown',
          name: basicData?.Name?.value || `Element_${itemData.localId}`,
          propertysets: Object.entries(psets).map(([name, props]) => ({
            name,
            properties: Object.entries(props).map(([key, value]) => ({ key, value }))
          }))
        };
        
        setSelectedItemData(formattedData);
      } catch (error) {
        console.error('Error getting element details:', error);
      }
    } else {
      setSelectedItemData(null);
      setFormattedPsets({});
    }
    
    // Call original callback if it exists
    if (onItemSelected) onItemSelected(itemData);
  }, [onItemSelected]);

  // Función para seleccionar elemento y mostrar sus propiedades
  const selectElementAndShowProperties = async (item: SelectedItemData | null) => {
    if (!item) {
      setSelectedItem(null);
      setSelectedItemData(null);
      setFormattedPsets({});
      setShowPropertyPanel(false);
      
      // Resetear highlight si hay algo seleccionado
      await resetHighlight(selectedModelRef.current, selectedLocalIdRef.current);
      if (fragments) await fragments.update(true);
      
      selectedModelRef.current = null;
      selectedLocalIdRef.current = null;
      return;
    }

    // Actualizar referencias
    selectedModelRef.current = item.model;
    selectedLocalIdRef.current = item.localId;
    
    // Actualizar el elemento seleccionado
    setSelectedItem(item);
    
    // Resaltar el elemento
    await resetHighlight(selectedModelRef.current, selectedLocalIdRef.current);
    await highlightElement(item.model, item.localId, defaultHighlightMaterial);
    if (fragments) await fragments.update(true);
    
    // Obtener y mostrar datos
    await handleItemSelectedInternal(item);
    setShowPropertyPanel(true);
  };

  // Realiza un raycasting y devuelve el primer elemento encontrado
  const performRaycasting = async (event: MouseEvent | React.MouseEvent) => {
    if (!world || !fragments || models.length === 0 || !world.renderer?.three?.domElement) return null;
    
    // Obtener coordenadas del click
    const mouse = new THREE.Vector2();
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    
    // Intentar realizar raycasting en todos los modelos cargados
    for (const model of models) {
      try {
        const result = await model.raycast({
          camera: world.camera.three,
          mouse,
          dom: world.renderer.three.domElement,
        });
        
        if (result) {
          return {
            model,
            localId: result.localId
          } as SelectedItemData;
        }
      } catch (error) {
        console.warn("Error en raycasting:", error);
      }
    }
    
    return null;
  };

  // Función para manejar el click derecho
  const handleContextMenu = async (event: React.MouseEvent) => {
    event.preventDefault(); // Prevenir el menú contextual del navegador
    
    // Realizar raycasting
    const hitResult = await performRaycasting(event);
    
    // Si encontramos un elemento, mostrar menú contextual
    if (hitResult) {
      // También seleccionamos el elemento (lo resaltamos) como si hubiéramos hecho click izquierdo
      await resetHighlight(selectedModelRef.current, selectedLocalIdRef.current);
      await highlightElement(hitResult.model, hitResult.localId, defaultHighlightMaterial);
      if (fragments) await fragments.update(true);
      
      selectedModelRef.current = hitResult.model;
      selectedLocalIdRef.current = hitResult.localId;
      setSelectedItem(hitResult);
      
      // Mostramos el menú contextual
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        item: hitResult
      });
    } else {
      // Si click en vacío, ocultar menú contextual
      setContextMenu(prev => ({
        ...prev,
        visible: false,
        item: null
      }));
      
      // También deseleccionamos elemento
      await resetHighlight(selectedModelRef.current, selectedLocalIdRef.current);
      if (fragments) await fragments.update(true);
      
      selectedModelRef.current = null;
      selectedLocalIdRef.current = null;
      setSelectedItem(null);
      handleItemSelectedInternal(null);
    }
  };
  
  // Función para manejar el click normal (izquierdo)
  const handleNormalClick = async (event: React.MouseEvent) => {
    // Ocultar el menú contextual si está visible
    if (contextMenu.visible) {
      setContextMenu(prev => ({
        ...prev,
        visible: false
      }));
      return;
    }
    
    // Si el panel de propiedades está abierto, lo cerramos al hacer click en cualquier lugar
    if (showPropertyPanel) {
      setShowPropertyPanel(false);
      return;
    }
    
    // Realizar raycasting
    const hitResult = await performRaycasting(event);
    
    // Resetear highlight previo
    await resetHighlight(selectedModelRef.current, selectedLocalIdRef.current);
    
    if (hitResult) {
      // Actualizamos referencias y aplicamos highlight
      selectedModelRef.current = hitResult.model;
      selectedLocalIdRef.current = hitResult.localId;
      setSelectedItem(hitResult);
      
      await highlightElement(hitResult.model, hitResult.localId, defaultHighlightMaterial);
      handleItemSelectedInternal(hitResult);
    } else {
      // Si click en vacío, reset completo
      selectedModelRef.current = null;
      selectedLocalIdRef.current = null;
      setSelectedItem(null);
      handleItemSelectedInternal(null);
    }
    
    // Actualizar visualización
    if (fragments) await fragments.update(true);
  };
    
  // Función para ocultar el menú contextual
  const hideContextMenu = () => {
    setContextMenu(prev => ({
      ...prev,
      visible: false
    }));
  };
  
  // Función para mostrar propiedades desde el menú contextual
  const showPropertiesFromContext = () => {
    if (contextMenu.item) {
      // Usar la función unificada para seleccionar y mostrar propiedades
      selectElementAndShowProperties(contextMenu.item);
      
      // Ocultar menú contextual después de seleccionar
      hideContextMenu();
    }
  };

  // Configurar raycasting para selección automática de elementos
  useEffect(() => {
    const container = containerRef?.current;
    if (!container || !world || !fragments || models.length === 0) return;
    
    console.log("🔄 Setting up raycasting with", models.length, "models");
    
    // Declare mouse object
    const mouse = new THREE.Vector2();
    
    const handleClick = async (event: MouseEvent) => {
      console.log("🖱️ Click detected");
      
      // Check that we have the DOM element of the renderer
      if (!world.renderer || !world.renderer.three || !world.renderer.three.domElement) {
        console.error("Renderer DOM element not available for raycast");
        return;
      }
      
      // Update coordinates
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      
      const promises: Promise<any>[] = [];
      
      // Reset previous highlight
      promises.push(resetHighlight(selectedModelRef.current, selectedLocalIdRef.current));
      
      let foundElement = false;
      
      // Try each model until finding one that works
      for (const model of models) {
        try {
          // Call raycast
          const result = await model.raycast({
            camera: world.camera.three,
            mouse: mouse,
            dom: world.renderer.three.domElement
          });
          
          // If we found an element
          if (result) {
            console.log(`✅ Element found in model ${model.id}, ID: ${result.localId}`);
            
            // Update references
            selectedModelRef.current = model;
            selectedLocalIdRef.current = result.localId;
            
            const selectedItemData: SelectedItemData = {
              model: model,
              localId: result.localId
            };
            
            setSelectedItem(selectedItemData);
            handleItemSelectedInternal(selectedItemData);
            
            // Apply highlight
            promises.push(highlightElement(model, result.localId, defaultHighlightMaterial));
            foundElement = true;
            break; // Exit loop after finding an element
          }
        } catch (error) {
          console.warn(`Error in raycast of model ${model.id}:`, error);
          // Continue with next model
        }
      }
      
      // If we didn't find anything, clear current selection
      if (!foundElement) {
        selectedModelRef.current = null;
        selectedLocalIdRef.current = null;
        setSelectedItem(null);
        handleItemSelectedInternal(null);
      }
      
      // Update visualization at the end
      promises.push(fragments.update(true));
      
      // Execute all promises
      try {
        await Promise.all(promises);
      } catch (error) {
        console.error("Error processing promises:", error);
      }
    };
    
    // Add listener
    container.addEventListener('click', handleClick);
    
    // Clean up when unmounting
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [world, models, fragments, handleItemSelectedInternal, containerRef]);

  return {
    selectedItem,
    showPropertyPanel,
    selectedItemData,
    formattedPsets,
    contextMenu,
    setShowPropertyPanel,
    selectElementAndShowProperties,
    handleContextMenu,
    handleNormalClick,
    hideContextMenu,
    showPropertiesFromContext
  };
};