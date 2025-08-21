import { useEffect, useCallback } from 'react';
import { useToolbarState } from './useToolbarState';
import { CategoryService } from '../services/CategoryService';
import { LayerService } from '../services/LayerService';
import { GeometryService } from '../services/GeometryService';
import { ViewerToolbarProps } from '../types/ViewerToolbarTypes';
import { IfcSpecialty } from '../utils/LayerVisibilityUtils';

export const useViewerToolbar = (props: ViewerToolbarProps) => {
  const {
    onCenterModel,
    models = [],
    fragments = null,
    onToggleIsolationPanel,
    isIsolationActive = false,
    world,
    onAddRandomGeometry,
    onRemoveRandomGeometry,
    onClearCollectionGeometries,
    // NUEVAS PROPS
    onToggleFloorPlansPanel,
    isFloorPlansActive = false
  } = props;

  const state = useToolbarState();
  const {
    activePanel,
    modelCategories,
    categoriesVisibility,
    isLoading,
    searchTerm,
    layersVisibility,
    isLoadingLayers,
    layerSearchTerm,
    hasRandomGeometries,
    errorMessage,
    notification,
    modelsRef,
    fragmentsRef,
    worldRef,
    operationInProgressRef,
    setActivePanel,
    setModelCategories,
    setCategoriesVisibility,
    setIsLoading,
    setSearchTerm,
    setLayersVisibility,
    setIsLoadingLayers,
    setLayerSearchTerm,
    setHasRandomGeometries,
    setErrorMessage,
    showNotification
  } = state;

  // Actualizar referencias cuando cambien los props
  useEffect(() => {
    modelsRef.current = models || [];
    fragmentsRef.current = fragments;
    worldRef.current = world;
  }, [models, fragments, world, modelsRef, fragmentsRef, worldRef]);

  

  // Cargar categorías IFC de los modelos
  const loadModelCategories = useCallback(async () => {
    if (operationInProgressRef.current) return;
    if (!modelsRef.current.length || !fragmentsRef.current) return;
    
    operationInProgressRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const result = await CategoryService.loadModelCategories(
        modelsRef.current,
        fragmentsRef.current
      );
      
      setModelCategories(result.categories);
      setCategoriesVisibility(result.visibility);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      setErrorMessage("Error al cargar categorías. Inténtelo de nuevo.");
    } finally {
      setIsLoading(false);
      operationInProgressRef.current = false;
    }
  }, [modelsRef, fragmentsRef, operationInProgressRef, setIsLoading, setErrorMessage, setModelCategories, setCategoriesVisibility]);

  // Cargar estados de visibilidad de las capas/especialidades
  const loadLayersVisibilityState = useCallback(async () => {
    if (!modelsRef.current.length || !fragmentsRef.current) return;
    
    setIsLoadingLayers(true);
    
    try {
      const updatedVisibility = await LayerService.loadLayersVisibilityState(modelsRef.current);
      setLayersVisibility(updatedVisibility);
    } catch (error) {
      console.error("Error al cargar estados de visibilidad de capas:", error);
    } finally {
      setIsLoadingLayers(false);
    }
  }, [modelsRef, fragmentsRef, setIsLoadingLayers, setLayersVisibility]);

  // Función para comprobar si hay geometrías aleatorias en la escena
  const checkForRandomGeometries = useCallback(() => {
    if (!worldRef.current) return;
    
    const hasGeometries = GeometryService.checkForRandomGeometries(worldRef.current);
    setHasRandomGeometries(hasGeometries);
  }, [worldRef, setHasRandomGeometries]);

  // Función para activar/desactivar un panel
  const togglePanel = (panelId: string) => {
    if (activePanel === panelId) {
      setActivePanel(null);
    } else {
      setActivePanel(panelId);
      
      if (panelId === 'visibility' && models.length > 0 && fragments) {
        loadModelCategories();
      }
      
      if (panelId === 'layers' && models.length > 0 && fragments) {
        loadLayersVisibilityState();
      }
      
      if (panelId === 'geometry') {
        checkForRandomGeometries();
      }

      // NUEVA LÓGICA PARA FLOORPLANS
      if (panelId === 'floorplans') {
        console.log('Opening FloorPlans panel');
        // Aquí puedes agregar lógica específica para FloorPlans si es necesaria
      }
    }
  };

  // Manejador para el botón de FloorPlans
  const handleFloorPlansClick = useCallback(() => {
    if (props.onToggleFloorPlansPanel) {
      props.onToggleFloorPlansPanel();
    } else {
      // Si no hay handler específico, usar el panel interno
      togglePanel('floorplans');
    }
  }, [props, togglePanel]);

  // Función para manejar el click en el botón de centrar
  const handleCenterClick = () => {
    if (onCenterModel) {
      onCenterModel();
    }
  };
  
  // Función para manejar el click en el botón de aislar
  const handleIsolationClick = () => {
    if (onToggleIsolationPanel) {
      onToggleIsolationPanel();
    }
  };

  // Función para mostrar/ocultar una categoría específica
  const toggleCategoryVisibility = async (category: string) => {
    if (operationInProgressRef.current) return;
    if (!modelsRef.current.length || !fragmentsRef.current || !category) return;
    
    operationInProgressRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const newVisibility = !categoriesVisibility[category];
      
      await CategoryService.toggleCategoryVisibility(
        category,
        newVisibility,
        modelsRef.current,
        fragmentsRef.current
      );
      
      setCategoriesVisibility(prev => ({
        ...prev,
        [category]: newVisibility
      }));
    } catch (error) {
      console.error(`Error al cambiar visibilidad de ${category}:`, error);
      setErrorMessage(`Error al cambiar visibilidad de ${CategoryService.getCategoryDisplayName(category)}`);
    } finally {
      setIsLoading(false);
      operationInProgressRef.current = false;
    }
  };

  // Función para mostrar todas las categorías
  const showAllCategories = async () => {
    if (operationInProgressRef.current) return;
    if (!modelsRef.current.length || !fragmentsRef.current) return;
    
    operationInProgressRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      await CategoryService.toggleAllCategories(
        modelCategories,
        true,
        modelsRef.current,
        fragmentsRef.current
      );
      
      const updatedVisibility: Record<string, boolean> = {};
      modelCategories.forEach(category => {
        updatedVisibility[category] = true;
      });
      setCategoriesVisibility(updatedVisibility);
    } catch (error) {
      console.error("Error al mostrar todas las categorías:", error);
      setErrorMessage("Error al mostrar todas las categorías");
    } finally {
      setIsLoading(false);
      operationInProgressRef.current = false;
    }
  };

  // Función para ocultar todas las categorías
  const hideAllCategories = async () => {
    if (operationInProgressRef.current) return;
    if (!modelsRef.current.length || !fragmentsRef.current) return;
    
    operationInProgressRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      await CategoryService.toggleAllCategories(
        modelCategories,
        false,
        modelsRef.current,
        fragmentsRef.current
      );
      
      const updatedVisibility: Record<string, boolean> = {};
      modelCategories.forEach(category => {
        updatedVisibility[category] = false;
      });
      setCategoriesVisibility(updatedVisibility);
    } catch (error) {
      console.error("Error al ocultar todas las categorías:", error);
      setErrorMessage("Error al ocultar todas las categorías");
    } finally {
      setIsLoading(false);
      operationInProgressRef.current = false;
    }
  };

  // Función para cambiar visibilidad de una capa/especialidad
  const toggleLayerVisibility = async (specialty: IfcSpecialty) => {
    if (!modelsRef.current.length || !fragmentsRef.current) return;
    
    setIsLoadingLayers(true);
    
    try {
      const newVisibility = await LayerService.toggleLayerVisibility(
        specialty,
        layersVisibility[specialty],
        modelsRef.current,
        fragmentsRef.current
      );
      
      setLayersVisibility(prev => ({
        ...prev,
        [specialty]: newVisibility
      }));
    } catch (error) {
      console.error(`Error al cambiar visibilidad de especialidad ${specialty}:`, error);
    } finally {
      setIsLoadingLayers(false);
    }
  };

  // Función para mostrar todas las capas
  const showAllLayers = async () => {
    if (!modelsRef.current.length || !fragmentsRef.current || isLoadingLayers) return;
    
    setIsLoadingLayers(true);
    
    try {
      const updatedVisibility = await LayerService.toggleAllLayers(
        layersVisibility,
        true,
        modelsRef.current,
        fragmentsRef.current
      );
      
      setLayersVisibility(updatedVisibility);
    } catch (error) {
      console.error("Error al mostrar todas las capas:", error);
    } finally {
      setIsLoadingLayers(false);
    }
  };

  // Función para ocultar todas las capas
  const hideAllLayers = async () => {
    if (!modelsRef.current.length || !fragmentsRef.current || isLoadingLayers) return;
    
    setIsLoadingLayers(true);
    
    try {
      const updatedVisibility = await LayerService.toggleAllLayers(
        layersVisibility,
        false,
        modelsRef.current,
        fragmentsRef.current
      );
      
      setLayersVisibility(updatedVisibility);
    } catch (error) {
      console.error("Error al ocultar todas las capas:", error);
    } finally {
      setIsLoadingLayers(false);
    }
  };

  // Función para crear geometrías aleatorias
  const createRandomGeometry = () => {
    if (onAddRandomGeometry) {
      onAddRandomGeometry();
      checkForRandomGeometries();
      return;
    }
    
    if (!worldRef.current) {
      console.error("World not initialized");
      return;
    }
    
    try {
      const count = GeometryService.createRandomGeometry(worldRef.current);
      setHasRandomGeometries(true);
      
      showNotification(`Creadas ${count} geometrías aleatorias`, 'success');
    } catch (error) {
      console.error("Error al crear geometrías aleatorias:", error);
      showNotification("Error al crear geometrías aleatorias", 'error');
    }
  };

  // Función para eliminar geometrías aleatorias
  const removeRandomGeometries = () => {
    if (onRemoveRandomGeometry) {
      onRemoveRandomGeometry();
      setHasRandomGeometries(false);
      return;
    }
    
    if (!worldRef.current) {
      console.error("World not initialized");
      return;
    }
    
    try {
      const removed = GeometryService.removeRandomGeometries(worldRef.current);
      
      if (removed) {
        setHasRandomGeometries(false);
        showNotification('Geometrías aleatorias eliminadas', 'info');
      } else {
        showNotification('No hay geometrías aleatorias para eliminar', 'info');
      }
    } catch (error) {
      console.error("Error al eliminar geometrías aleatorias:", error);
    }
  };

  

  // Efectos para cargar datos cuando cambian los modelos o el panel activo
  useEffect(() => {
    if (activePanel === 'visibility' && models.length > 0 && fragments) {
      loadModelCategories();
    }
    
    if (activePanel === 'layers' && models.length > 0 && fragments) {
      loadLayersVisibilityState();
    }
    
    if (activePanel === 'geometry') {
      checkForRandomGeometries();
    }
  }, [models, fragments, activePanel, loadModelCategories, loadLayersVisibilityState, checkForRandomGeometries]);

  return {
    // Estado
    activePanel,
    modelCategories,
    categoriesVisibility,
    isLoading,
    searchTerm,
    layersVisibility,
    isLoadingLayers,
    layerSearchTerm,
    hasRandomGeometries,
    errorMessage,
    notification,
    
    // Setters
    setSearchTerm,
    setLayerSearchTerm,
    
    // Handlers
    togglePanel,
    handleCenterClick,
    handleIsolationClick,
    handleFloorPlansClick, // NUEVO
    toggleCategoryVisibility,
    showAllCategories,
    hideAllCategories,
    toggleLayerVisibility,
    showAllLayers,
    hideAllLayers,
    createRandomGeometry,
    removeRandomGeometries,
    
    // Props pasados
    isIsolationActive,
    isFloorPlansActive: props.isFloorPlansActive || false, // Nuevo estado
    models,
    onClearCollectionGeometries
  };
};