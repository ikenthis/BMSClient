//BIMViewerPage.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import ModelToolbar from './ModelToolbar';
import ViewerToolbar from './ViewerToolbar';
import ElementIsolationManager from './utils/ElementIsolationManager';
import LoadingOverlay from './Overlay/LoadingOverlay';
import ErrorOverlay from './Overlay/ErrorOverlay';
import PropertyPanel from './ViewerPanels/PropertyPanel';
import ModelSidebar from './ViewerPanels/ModelSidebar';
import InventoryPanel from './ViewerPanels/InventoryPanel';
import ElementInfoPanel from './ViewerPanels/ElementInfoPanel';
import SpacesPanel from './ViewerPanels/CollectionsPanel';
import { useContainerSize } from './hooks/useContainerSize';
import { useSceneInitialization } from './hooks/useSceneInitialization';
import { useModelLoader } from './hooks/useModelLoader';
import { useIfcSpaceVisibility } from './hooks/useIfcSpaceVisibility';
import { BIMViewerPageProps } from './utils/typeDefs';
import { useFloorPlans } from './hooks/useFloorPlans';
import { FloorPlansPanel } from './ViewerPanels/FloorPlansPanel';
import ArtworksPanel from './ViewerPanels/ArtworksPanel';
import ArtworkDetailPanel from './ViewerPanels/ArtWorkDetailPanel';
import artCollectionService, { ArtCollectionItemFormData } from './services/artCollectionService';
import ActivitiesPanel from './ViewerPanels/ActivitiesPanel';
import AIAssistantPanel from './ViewerPanels/AIAssistantPanel';
import AutonomousAIAgent from './services/autonomousAIAgent';


// NUEVOS IMPORTS PARA INTEGRACIÓN DE SENSORES
import EnhancedSensorsPanelMain from './ViewerPanels/SensorsPanel/SensorsPanelMain';
import { useHeatMap } from './ViewerPanels/SensorsPanel/hooks/useHeatMap';
import { heatMapVisualization } from './ViewerPanels/SensorsPanel/utils/HeatMapVisualization';
import { sensorSpaceIntegration } from './ViewerPanels/SensorsPanel/services/sensorSpaceIntegrationService';
import { SpaceElement, HeatMapData, SensorSpaceMapping } from './utils/typeDefs';
import SimpleHeatMapTestPanel from './ViewerPanels/SensorsPanel/SimpleHeatMapTestPanel';
import SimpleFloorPlansGenerator from './utils/SimpleFloorPlansGenerator';
import IoTPredictiveTab from './ViewerPanels/AITabs/IoTPredictiveTab';
import IoTReportsTab from './ViewerPanels/AITabs/IoTReportsTab';
import HeatMapInfoOverlay from './ViewerPanels/SensorsPanel/utils/HeatMapInfoOverlay';

import { 
  zoomToElement, 
  zoomToElements, 
  resetView
} from './utils/ElementZoomUtils';

// Gestión de utilidades
import { useElementSelectionHandlers } from './utils/elementSelectionHandlers';
import { useContextMenuHandlers } from './utils/contextMenuHandlers';
import useModelManagementHandlers from './utils/modelManagementHandler';
import collectionGeometryHandler from './utils/CollectionGeometryHandlers';



import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';



interface ExtendedBIMViewerPageProps extends BIMViewerPageProps {
  modelUrls?: string[]; // Soporte para múltiples URLs
}

/**
 * BIM viewer component with integrated toolbar and auto-centering
 */
const BIMViewerPage: React.FC<ExtendedBIMViewerPageProps> = ({
  onModelLoaded,
  onItemSelected,
  modelUrl, // URL única
  modelUrls: initialModelUrls // Array de URLs inicial
}) => {
  // Container ref
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Estado para controlar si el selector de modelos está abierto
  const [isModelSidebarOpen, setIsModelSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Estado para los otros paneles
  const [isActivitiesPanelOpen, setIsActivitiesPanelOpen] = useState(false);
  const [isInventoryPanelOpen, setIsInventoryPanelOpen] = useState(false);
  const [isElementInfoPanelOpen, setIsElementInfoPanelOpen] = useState(false);
  const [isSpacesPanelOpen, setIsSpacesPanelOpen] = useState(false);
  const [isReportsPanelOpen, setIsReportsPanelOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isFloorPlansPanelOpen, setIsFloorPlansPanelOpen] = useState(false);
  const [currentFloorPlanId, setCurrentFloorPlanId] = useState<string | null>(null);
  const [isFloorPlansGeneratorOpen, setIsFloorPlansGeneratorOpen] = useState(false);
  const [components, setComponents] = useState<any>(null);
  const [isIn2DMode, setIsIn2DMode] = useState(false);
  const [currentFloorPlan, setCurrentFloorPlan] = useState<any>(null);
  const [isResettingView, setIsResettingView] = useState(false);
  
  // Estado para el panel de aislamiento
  const [isIsolationPanelOpen, setIsIsolationPanelOpen] = useState(false);
  const [isolatedCategory, setIsolatedCategory] = useState<string | null>(null);
  
  // Estado para controlar el bloqueo de selección de elementos
  const [elementSelectionLocked, setElementSelectionLocked] = useState(false);
  
  // Estado para las geometrías de colección
  const [hasCollectionGeometries, setHasCollectionGeometries] = useState(false);
  
  // Initialize scene and core state
  const [state, loadModelFunc, initialized] = useSceneInitialization(containerRef, null);
  
  // Monitor container size
  const containerSize = useContainerSize(containerRef, state.world, state.fragments);
  
  // Model loading and auto-centering
  const { centerModel } = useModelLoader(state.world, state.models, onModelLoaded);

  //Artworks panel state
  const [isArtworksPanelOpen, setIsArtworksPanelOpen] = useState<boolean>(false);
  const [isArtworkDetailPanelOpen, setIsArtworkDetailPanelOpen] = useState<boolean>(false);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtCollectionItemFormData | null>(null);
  const [isAIAssistantPanelOpen, setIsAIAssistantPanelOpen] = useState<boolean>(false);
  const [elementsData, setElementsData] = useState<{
  elementCounts: Record<string, number>;
  elementTypes: string[];
  totalElements: number;
  properties: Record<string, any[]>;
} | null>(null);

const [aiAgent, setAIAgent] = useState<any>(null);

  // NUEVOS ESTADOS PARA INTEGRACIÓN DE SENSORES
  const [isSensorsPanelOpen, setIsSensorsPanelOpen] = useState<boolean>(false);
  const [spacesForSensors, setSpacesForSensors] = useState<SpaceElement[]>([]);
  const [heatMapActive, setHeatMapActive] = useState(false);
  // const [heatMapActive, setHeatMapActive] = useState(false);
  // const [heatMapData, setHeatMapData] = useState<Map<string, HeatMapData>>(new Map());
  // const [hasHeatmapData, setHasHeatmapData] = useState(false);
  const [isHeatMapTestPanelOpen, setIsHeatMapTestPanelOpen] = useState(false);
  const [mouseDownTime, setMouseDownTime] = useState(0);
  const [isIoTPredictivePanelOpen, setIsIoTPredictivePanelOpen] = useState<boolean>(false);
  const [isIoTReportsPanelOpen, setIsIoTReportsPanelOpen] = useState<boolean>(false);
  const [enableHeatMapHover, setEnableHeatMapHover] = useState(true);
  const [useTestDataForHover, setUseTestDataForHover] = useState(true);
  const [showHeatMapInfo, setShowHeatMapInfo] = useState(true);
  
  
  const heatMap = useHeatMap({
    world: state.world,
    fragments: state.fragments,
    spaces: spacesForSensors,
    autoInitialize: true,
    config: {
      temperatureRange: {
        min: 18,
        max: 28,
        optimal: { min: 20, max: 24 }
      },
      opacity: 0.7,
      showLabels: true,
      animateTransitions: true
    }
  });

  // 🔥 NUEVO: Hook para gestionar visibilidad de IFCSPACE
    const ifcSpaceVisibility = useIfcSpaceVisibility({
      fragments: state.fragments,
      models: state.models,
      isHeatMapActive: heatMap.isActive,
      autoHideOnInit: true // Ocultar automáticamente al inicializar
    });

  // Gestión de modelos
  const {
    currentModelUrls,
    isLoadingModels,
    loadedModelUrls,
    handleModelUrlsChange
  } = useModelManagementHandlers({
    initialModelUrls,
    modelUrl,
    fragments: state.fragments,
    models: state.models,
    world: state.world,
    loadModel: loadModelFunc,
    centerModel
  });
  
  // Gestión de selección de elementos
  const {
    selectedItem,
    showPropertyPanel,
    selectedItemData,
    formattedPsets,
    showToolbar,
    selectElement,
    selectElementAndShowProperties,
    handleClosePropertyPanel,
    setShowPropertyPanel,
    setShowToolbar
  } = useElementSelectionHandlers({
    fragments: state.fragments,
    onItemSelected
  });

  // Inicializar components cuando el world esté listo
    useEffect(() => {
      if (state.world && !components) {
        // Crear instancia de components si no existe
        const comp = new OBC.Components();
        setComponents(comp);
        console.log('Components inicializados para FloorPlans');
      }
    }, [state.world, components]);

    // Función para manejar el cambio a vista 2D desde cualquier generador
const handle2DModeChange = useCallback((is2D: boolean, planData?: any) => {
  setIsIn2DMode(is2D);
  setCurrentFloorPlan(planData || null);
  
  if (is2D && planData) {
    console.log(`📐 Modo 2D activado para plano: ${planData.name}`);
    
    // Configurar cámara para vista 2D
    if (state.world && state.world.camera) {
      const camera = state.world.camera.three;
      const bounds = planData.boundingBox;
      
      const centerX = (bounds.min.x + bounds.max.x) / 2;
      const centerZ = (bounds.min.z + bounds.max.z) / 2;
      const height = planData.level + 20;
      
      // Vista cenital
      camera.position.set(centerX, height, centerZ);
      camera.lookAt(centerX, planData.level, centerZ);
      
      // Forzar update de la cámara
      //camera.updateProjectionMatrix();
    }
    
    // Configurar renderer para vista 2D
    if (state.world && state.world.renderer) {
      const renderer = state.world.renderer.three;
      renderer.setClearColor(0xffffff, 1.0); // Fondo blanco
    }
    
  } else {
    console.log('🎯 Volviendo a modo 3D normal');
    
    // Restaurar vista 3D
    if (state.world && state.world.camera) {
      const camera = state.world.camera.three;
      camera.position.set(10, 10, 10);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
    
    // Restaurar renderer normal
    if (state.world && state.world.renderer) {
      const renderer = state.world.renderer.three;
      renderer.setClearColor(0x202020, 1.0); // Fondo gris oscuro
    }
  }
  
  // Forzar actualización de fragments
  if (state.fragments) {
    state.fragments.update(true);
  }
}, [state.world, state.fragments]);
      
  // Gestión de menú contextual
  const {
    contextMenu,
    handleContextMenu,
    handleNormalClick: originalHandleNormalClick,
    showPropertiesFromContext
  } = useContextMenuHandlers({
    world: state.world,
    models: state.models,
    fragments: state.fragments,
    showPropertyPanel,
    setShowPropertyPanel,
    setShowToolbar,
    selectElement,
    selectElementAndShowProperties
  }); 

 // ⭐ EFFECT CRÍTICO: Exponer variables para debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).spacesForSensors = spacesForSensors;
      (window as any).state = state;
      (window as any).heatMapHook = heatMap;
      (window as any).heatMapVisualization = heatMapVisualization;
      (window as any).sensorSpaceIntegration = sensorSpaceIntegration;
      (window as any).ifcSpaceVisibility = ifcSpaceVisibility;
      
      console.log('🔧 Variables expuestas para debugging:', {
        spacesCount: spacesForSensors.length,
        stateReady: !!state.world && !!state.fragments,
        heatMapReady: heatMap.isInitialized,
        modelsCount: state.models.length
      });
    }
  }, [spacesForSensors, state, heatMap]);

  // Agregar un manejador para el botón ArtWorks
  const handleArtworksButtonClick = () => {
    setIsArtworksPanelOpen(true);
    console.log('Opening Artworks panel');
  };

  // Manejador para cerrar el panel de detalles de obra de arte
  const handleCloseArtworkDetailPanel = () => {
    setIsArtworkDetailPanelOpen(false);
    console.log('Closing Artwork Detail panel');
  };


  // ⭐ EFFECT CRÍTICO: Cargar espacios para sensores
  useEffect(() => {
    console.log('🔄 Effect: Cargando espacios para sensores...', {
      hasFragments: !!state.fragments,
      modelsCount: state.models.length,
      heatMapInitialized: heatMap.isInitialized
    });

    if (state.fragments && state.models.length > 0) {
      loadSpacesFromFragmentsModels(state.fragments).then(spaces => {
        console.log(`✅ Espacios cargados: ${spaces.length}`);
        setSpacesForSensors(spaces);
        
        // Debug cada espacio cargado
        spaces.forEach((space, idx) => {
          console.log(`  ${idx + 1}. ${space.name} (GUID: ${space.properties?.globalId?.slice(-8)}...)`);
        });
        
        // ⭐ INICIALIZACIÓN MANUAL DEL HEATMAP SI ES NECESARIO
        setTimeout(async () => {
          if (!heatMap.isInitialized && state.world && state.fragments) {
            console.log('🔥 Forzando inicialización manual del HeatMap...');
            try {
              await heatMapVisualization.initialize(state.world, state.fragments);
              console.log('✅ HeatMap inicializado manualmente');
            } catch (error) {
              console.error('❌ Error inicializando HeatMap:', error);
            }
          }
        }, 1000);
      }).catch(error => {
        console.error('❌ Error cargando espacios:', error);
      });
    }
  }, [state.fragments, state.models.length, heatMap.isInitialized]);

  // ⭐ EFFECT: Inicializar gestores cuando esté listo
  useEffect(() => {
    if (state.world && state.fragments && state.models.length > 0) {
      // Inicializar agente IA
      const agent = new AutonomousAIAgent().initialize(state.world, state.fragments, state.models);
      setAIAgent(agent);
      console.log("🤖 Agente IA autónomo inicializado");
      
      // Inicializar gestor de geometrías
      collectionGeometryHandler.initialize(state.world);
      console.log("🎨 Gestor de geometrías de colecciones inicializado");
      setHasCollectionGeometries(true);
    }
  }, [state.world, state.fragments, state.models.length]);
  
  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      if (collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.clear();
      }
      heatMapVisualization.dispose();
    };
  }, []);

  const handleFloorPlansGeneratorToggle = () => {
  setIsFloorPlansGeneratorOpen(prev => !prev);
  console.log(`${isFloorPlansGeneratorOpen ? 'Closing' : 'Opening'} Floor Plans Generator`);
};

  // Creamos un manejador de click envolvente que verifica si la selección está bloqueada
  const handleNormalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Si la selección está bloqueada, no procesamos el click
    if (elementSelectionLocked) {
      console.log('Element selection is locked - ignoring click');
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const clearAllCollectionGeometries = () => {
      if (collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.clear();
        console.log("Todas las geometrías de colección han sido eliminadas");
        
        // Notificar al usuario
        setNotification({
          message: 'Todas las geometrías de colección han sido eliminadas',
          type: 'info'
        });
        
        // Limpiar notificación después de unos segundos
        setTimeout(() => {
          setNotification(null);
        }, 3000);
        
        // Forzar actualización del renderizado
        if (state.fragments) {
          state.fragments.update(true);
        }
      }
    };
    
    // Si no está bloqueada, procesamos el click normalmente
    originalHandleNormalClick(e);
  };

  // Manejar respuesta de carga de modelos y mostrar notificaciones
  const handleModelUrlsChangeWithNotification = async (urls: string[]) => {
    // Para depuración
    console.log("[DEBUG BIMViewerPage] Solicitando carga de URLs:", urls);
    console.log("[DEBUG BIMViewerPage] URLs actuales:", Array.from(loadedModelUrls));
    
    const result = await handleModelUrlsChange(urls);
    
    if (result.message) {
      setNotification({
        message: result.message,
        type: result.success ? 'success' : 'error'
      });
      
      // Limpiar notificación después de unos segundos
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
    
    return result;
  };

  // Manejador para toggle del panel de propiedades desde el botón Psets
  const handlePropertyPanelToggle = (show: boolean) => {
    // Si hay un elemento seleccionado, mostramos sus propiedades
    if (selectedItem && show) {
      selectElementAndShowProperties(selectedItem);
    } else {
      // Si no hay elemento o queremos ocultar, simplemente actualizamos el estado
      setShowPropertyPanel(show);
      setShowToolbar(!show); // Mostrar/ocultar toolbar según corresponda
    }
  };

  // Función para manejar la selección de elementos desde el panel de inventario
  const handleInventoryElementSelect = (item: { model: FRAGS.FragmentsModel; localId: number }) => {
    // Si la selección está bloqueada (porque hay elementos aislados),
    // permitimos la selección desde el inventario pero no cambiamos el estado de bloqueo
    selectElementAndShowProperties(item);
    
    // Verificar si el elemento seleccionado es un espacio (IFCSPACE)
    if (item && item.model) {
      item.model.getItemsData([item.localId], {
        includeProperties: true
      }).then(async (itemsData) => {
        if (itemsData && itemsData.length > 0) {
          const data = itemsData[0];
          
          // Si es un espacio y tiene un GUID, verificar si tiene colecciones asociadas
          if (data.type === 'IFCSPACE' && data.guid) {
            const hasGeometries = collectionGeometryHandler.hasGeometriesInSpace(data.guid);
            if (hasGeometries) {
              // Si tiene geometrías asociadas, mostrarlas
              collectionGeometryHandler.showOnlySpaceGeometries(data.guid);
              console.log(`Mostrando geometrías para el espacio ${data.guid}`);
            }
          }
        }
      }).catch(error => {
        console.error("Error al verificar elemento seleccionado:", error);
      });
    }
  };

  // Nuevo manejador para cuando se aísla un elemento desde el panel de inventario
  const handleInventoryElementIsolated = (item: { model: FRAGS.FragmentsModel; localId: number; category?: string }) => {
    // Activamos el aislamiento del elemento
    const category = item.category || `Element_${item.localId}`;
    setIsolatedCategory(category);
    setElementSelectionLocked(true);
    console.log(`Element isolated from inventory: ${category} - Selection locked`);
  };

  // Función para manejar la selección de elementos desde el panel de espacios
  const handleSpaceElementSelect = (item: { model: FRAGS.FragmentsModel; localId: number }) => {
    // Similar al manejo de selección desde inventario
    selectElementAndShowProperties(item);
  };

  // Manejador para restablecer el aislamiento desde los paneles
  const handleResetIsolation = () => {
    setIsolatedCategory(null);
    setElementSelectionLocked(false);
    console.log("Isolation reset - Selection unlocked");
    
    // Restablecer visualización de geometrías de colección
    if (collectionGeometryHandler.isInitialized()) {
      collectionGeometryHandler.showAllGeometries();
    }
  };

  // Manejador para cerrar el panel ElementInfo
  const handleCloseElementInfoPanel = () => {
    setIsElementInfoPanelOpen(false);
    console.log('Closing Element Info panel');
  };

  // Manejador para cerrar el panel de espacios
  const handleCloseSpacesPanel = () => {
    setIsSpacesPanelOpen(false);
    console.log('Closing Spaces panel');
  };

  const handleCloseActivitiesPanel = () => {
    setIsActivitiesPanelOpen(false);
    console.log('Closing Activities panel');
  };

  // Nuevo manejador para el panel de Sensores IoT
  const handleSensorsPanelToggle = () => {
    setIsSensorsPanelOpen(prev => !prev);
    console.log(`${isSensorsPanelOpen ? 'Closing' : 'Opening'} IoT Sensors panel`);
  };

  // Toggle del mapa de calor desde toolbar
  // ⭐ FUNCIÓN PRINCIPAL: Toggle del mapa de calor
  const handleHeatmapPanelToggle = async () => {
  console.log('🔥 Toggle HeatMap solicitado. Estado actual:', {
    isActive: heatMap.isActive,
    isInitialized: heatMap.isInitialized,
    hasData: heatMap.hasData,
    spacesCount: spacesForSensors.length
  });

  try {
    if (!heatMap.isInitialized) {
      console.log('⚠️ HeatMap no inicializado, forzando inicialización...');
      if (state.world && state.fragments) {
        await heatMapVisualization.initialize(state.world, state.fragments);
      } else {
        throw new Error('World o Fragments no disponibles');
      }
    }

    // ⭐ GENERAR DATOS DE PRUEBA SI NO HAY DATOS
    if (!heatMap.hasData && spacesForSensors.length > 0) {
      console.log('📊 Generando datos de prueba para HeatMap...');
      const testData: HeatMapData[] = spacesForSensors.slice(0, 5).map((space, index) => ({
        spaceGuid: space.properties?.globalId || `test-guid-${index}`,
        spaceName: space.name || `Espacio Test ${index + 1}`,
        temperature: 18 + (index * 2), // 18°C, 20°C, 22°C, 24°C, 26°C
        humidity: 45 + (index * 5),
        timestamp: new Date().toISOString(),
        quality: index < 2 ? 'good' : index < 4 ? 'warning' : 'critical'
      }));

      console.log('🧪 Aplicando datos de prueba:', testData);
      heatMapVisualization.updateHeatMapData(testData);
    }

    // 🔥 CAPTURAR EL ESTADO ANTES DEL TOGGLE
    const wasActive = heatMap.isActive;
    const currentDataCount = heatMap.dataCount;
    
    console.log(`🔄 Estado antes del toggle: ${wasActive ? 'ACTIVO' : 'INACTIVO'}`);

    // Toggle del estado
    await heatMap.toggle();
    
    // 🔥 USAR EL ESTADO ANTERIOR PARA DETERMINAR EL MENSAJE
    // Si estaba inactivo y ahora se activa -> mostrar "activado"
    // Si estaba activo y ahora se desactiva -> mostrar "desactivado"
    const message = !wasActive 
      ? `🌡️ Mapa de calor activado (${currentDataCount} espacios)`
      : '❄️ Mapa de calor desactivado';
    
    const notificationType = !wasActive ? 'success' : 'info';
    
    showNotification(message, notificationType);
    
    console.log('✅ Toggle HeatMap completado:', {
      previousState: wasActive ? 'ACTIVO' : 'INACTIVO',
      newState: !wasActive ? 'ACTIVO' : 'INACTIVO',
      dataCount: currentDataCount,
      messageShown: message
    });
    
  } catch (error) {
    console.error('❌ Error toggling heat map:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
};

  // Función para mostrar notificaciones
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Manejador para clicks en la barra de herramientas (actualizado para manejar doble clic)
  const handleToolbarSectionClick = (section: string, isDoubleClick: boolean = false) => { //
    if (isDoubleClick) { //
      if (section === 'Models') setIsModelSidebarOpen(false); //
      if (section === 'AddAct') setIsActivitiesPanelOpen(false); //
      else if (section === 'AddInf') setIsElementInfoPanelOpen(false); //
      else if (section === 'AddCol' || section === 'ArtWorks') setIsArtworksPanelOpen(false); //
      else if (section === 'Reports') setIsReportsPanelOpen(false); //
      else if (section === 'Filter') setIsFilterPanelOpen(false); //
      else if (section === 'AIAssistant') setIsAIAssistantPanelOpen(false); //
      else if (section === 'Sensors') setIsSensorsPanelOpen(false); 
      else if (section === 'IoTPredictive') setIsIoTPredictivePanelOpen(false);
      else if (section === 'IoTReports') setIsIoTReportsPanelOpen(false);
      return; //
    }
  
    if (section === 'Models') setIsModelSidebarOpen(true); //
    else if (section === 'AddAct') setIsActivitiesPanelOpen(true); //
    else if (section === 'AddInf') { //
      if (selectedItem) { //
        setIsElementInfoPanelOpen(true); //
        console.log('Opening Element Info panel for selected element', selectedItem); //
      } else { //
        console.log('No element selected - cannot open Element Info panel'); //
        setNotification({ //
          message: 'Selecciona un elemento primero para añadir información', //
          type: 'info' //
        });
        setTimeout(() => { setNotification(null); }, 3000); //
      }
    } else if (section === 'AddCol' || section === 'ArtWorks') setIsArtworksPanelOpen(true); //
    else if (section === 'Reports') setIsReportsPanelOpen(true); //
    else if (section === 'Filter') setIsFilterPanelOpen(true); //
    else if (section === 'AIAssistant') setIsAIAssistantPanelOpen(true); //
    else if (section === 'IoTPredictive') setIsIoTPredictivePanelOpen(true);
    else if (section === 'IoTReports') setIsIoTReportsPanelOpen(true);
    // No manejamos 'Sensors' aquí directamente, ya que ModelToolbar usará onSensorsPanelToggle
  };

  // Manejador específico para el panel de espacios desde el toolbar
  const handleSpacesPanelToggle = () => {
    setIsSpacesPanelOpen(prev => !prev);
    console.log(`${isSpacesPanelOpen ? 'Closing' : 'Opening'} Spaces panel`);
  };

  // Manejador para el botón de inventario en la barra secundaria
  const handleInventoryButtonClick = () => {
    setIsInventoryPanelOpen(true);
    console.log('Opening Inventory panel from secondary toolbar');
  };

  // Manejador para el botón de aislar en la barra de herramientas
  const handleToggleIsolationPanel = () => {
    setIsIsolationPanelOpen(!isIsolationPanelOpen);
    console.log(`${isIsolationPanelOpen ? 'Closing' : 'Opening'} Isolation panel`);
    
    // Si estamos cerrando el panel y hay una categoría aislada, restaurar la vista
    if (isIsolationPanelOpen && isolatedCategory) {
      // Desbloquear la selección al cerrar el panel
      setElementSelectionLocked(false);
    }
  };

  // Manejador para cuando se aísla una categoría
  const handleCategoryIsolated = (category: string | null) => {
    setIsolatedCategory(category);
    
    // Activar/desactivar el bloqueo de selección de elementos
    if (category !== null) {
      setElementSelectionLocked(true);
      console.log(`Category isolated: ${category} - Element selection locked`);
    } else {
      setElementSelectionLocked(false);
      console.log(`Category isolation cleared - Element selection unlocked`);
    }
  };

  // ⭐ NUEVOS MANEJADORES PARA COMPONENTES IoT
    const handleIoTPredictiveToggle = () => {
      setIsIoTPredictivePanelOpen(prev => !prev);
      console.log(`${isIoTPredictivePanelOpen ? 'Closing' : 'Opening'} IoT Predictive panel`);
    };

    const handleIoTReportsToggle = () => {
      setIsIoTReportsPanelOpen(prev => !prev);
      console.log(`${isIoTReportsPanelOpen ? 'Closing' : 'Opening'} IoT Reports panel`);
    };

    // Función para generar ID único (necesaria para los componentes IoT)
    const generateUniqueId = () => {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

  // Manejador para actualizar el estado de restauración de una obra de arte
  const handleUpdateArtworkStatus = async (artwork: ArtCollectionItemFormData, newStatus: string) => {
    if (!artwork.itemId) return;
    
    try {
      // Crear una copia actualizada del objeto artwork
      const updatedArtwork = {
        ...artwork,
        restaurationSchedule: {
          ...artwork.restaurationSchedule,
          status: newStatus
        }
      };
      
      // Llamar al servicio para actualizar
      const response = await artCollectionService.updateItem(artwork.itemId, {
        restaurationSchedule: updatedArtwork.restaurationSchedule
      });
      
      // Actualizar el estado local si la actualización fue exitosa
      if (response.status === 'success') {
        setSelectedArtwork(updatedArtwork);
        
        // Mostrar una notificación (opcional)
        setNotification({
          message: `Estado actualizado a "${newStatus}"`,
          type: 'success'
        });
        
        // Limpiar la notificación después de unos segundos
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
      
      return response;
    } catch (error) {
      console.error('Error al actualizar el estado de restauración:', error);
      
      // Mostrar una notificación de error (opcional)
      setNotification({
        message: 'Error al actualizar el estado de restauración',
        type: 'error'
      });
      
      // Limpiar la notificación después de unos segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      throw error;
    }
  };

  // Manejador para solicitar información de obra de arte
  const handleArtworkInfoRequest = (artwork: ArtCollectionItemFormData) => {
    console.log('Requesting artwork info:', artwork);
    setSelectedArtwork(artwork);
    setIsArtworkDetailPanelOpen(true);
  };

  // Versión mejorada con diagnóstico de GUID para handleSpaceWithArtworksSelected

// Solución corregida para handleSpaceWithArtworksSelected usando getGuid()

const handleSpaceWithArtworksSelected = (spaceGuid: string, spaceName: string) => {
  console.log(`Navegando a espacio con obras de arte: ${spaceName} (${spaceGuid})`);
  
  if (state.models.length > 0 && state.fragments && state.world) {
    console.log(`Buscando entre ${state.models.length} modelos...`);
    let spaceFound = false;
    
    // Recorrer todos los modelos
    for (const model of state.models) {
      // Buscar entre todos los espacios
      model.getItemsOfCategory('IFCSPACE').then(async spaces => {
        console.log(`Encontrados ${spaces.length} espacios en modelo ${model.id}`);
        
        for (const space of spaces) {
          try {
            const localId = await space.getLocalId();
            if (localId === null) continue;
            
            // CLAVE: Obtener el GUID directamente del objeto space
            const directGuid = await space.getGuid();
            
            // Limpiar los GUIDs para compararlos (eliminar guiones u otros caracteres)
            const cleanTargetGuid = spaceGuid.replace(/[-_]/g, '').toLowerCase();
            const cleanFoundGuid = directGuid.replace(/[-_]/g, '').toLowerCase();
            
            console.log(`Espacio ID ${localId} - GUID directo: ${directGuid}`);
            
            // Comparar con diferentes formatos
            if (directGuid === spaceGuid || 
                cleanFoundGuid === cleanTargetGuid) {
              
              console.log(`¡ESPACIO ENCONTRADO! ID: ${localId}, GUID: ${directGuid}`);
              spaceFound = true;
              
              // 1. Seleccionar el espacio
              selectElementAndShowProperties({ 
                model, 
                localId
              });
              
              // 2. Mostrar las geometrías asociadas a este espacio
              if (collectionGeometryHandler.isInitialized()) {
                collectionGeometryHandler.showOnlySpaceGeometries(spaceGuid);
                console.log(`Mostrando geometrías para el espacio ${spaceGuid}`);
              }
              
              // 3. Aplicar zoom al espacio
              const zoomOptions = {
                zoomFactor: 2.0,
                showBoundingBox: true,
                boundingBoxDuration: 3000,
                boundingBoxColor: 0xffd700,
                highlightElement: false,
                onlyShowBoundingBox: true
              };
              
              try {
                await zoomToElement(
                  model,
                  localId,
                  state.world,
                  state.fragments,
                  zoomOptions
                );
                
                // Actualizar fragmentos
                await state.fragments.update(true);
                
                console.log(`Zoom aplicado al espacio ${spaceName}`);
                
                // Mostrar notificación
                setNotification({
                  message: `Navegando a: ${spaceName}`,
                  type: 'info'
                });
                setTimeout(() => setNotification(null), 3000);
                
              } catch (zoomError) {
                console.error('Error al hacer zoom al espacio:', zoomError);
              }
              
              return; // Terminamos una vez encontrado el espacio
            }
          } catch (error) {
            console.error('Error al procesar espacio:', error);
          }
        }
        
        // Si es el último modelo y no se encontró el espacio, mostrar mensaje
        if (!spaceFound) {
          console.warn(`No se encontró el espacio con GUID: ${spaceGuid}`);
          
          setNotification({
            message: `No se encontró el espacio: ${spaceName}`,
            type: 'error'
          });
          setTimeout(() => setNotification(null), 5000);
        }
      }).catch(error => {
        console.error('Error buscando espacios en modelo:', error);
      });
    }
  } else {
    console.warn('No hay modelos cargados o world/fragments no inicializados');
    setNotification({
      message: 'No hay modelos cargados para navegar',
      type: 'error'
    });
    setTimeout(() => setNotification(null), 3000);
  }
}

  // Función para remover geometrías aleatorias
  const removeRandomGeometries = () => {
    console.log("Eliminando geometrías aleatorias...");
    
    // Verificar que world y scene estén inicializados
    if (!state.world) {
      console.error("World no inicializado");
      setNotification({
        message: 'Error: El mundo 3D no está inicializado',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Obtener la escena - IMPORTANTE: usar scene.three para acceder a la escena de Three.js
    const scene = state.world.scene.three;
    
    if (!scene) {
      console.error("Scene no disponible");
      setNotification({
        message: 'Error: La escena Three.js no está disponible',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    try {
      const existingGroup = scene.getObjectByName("randomGeometries");
      
      if (existingGroup) {
        scene.remove(existingGroup);
        
        // También eliminar las luces cuando se eliminan todas las geometrías
        const lightsGroup = scene.getObjectByName("randomGeometryLights");
        if (lightsGroup) {
          scene.remove(lightsGroup);
        }
        
        // Notificar al usuario
        setNotification({
          message: 'Geometrías aleatorias eliminadas',
          type: 'info'
        });
        
        // Limpiar notificación después de unos segundos
        setTimeout(() => {
          setNotification(null);
        }, 3000);
        
        // Forzar actualización del renderizado
        if (state.fragments) {
          state.fragments.update(true);
        }
      } else {
        // Notificar si no hay geometrías para eliminar
        setNotification({
          message: 'No hay geometrías aleatorias para eliminar',
          type: 'info'
        });
        
        // Limpiar notificación después de unos segundos
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    } catch (error) {
      console.error("Error al eliminar geometrías aleatorias:", error);
      setNotification({
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleCloseAIAssistantPanel = () => {
  setIsAIAssistantPanelOpen(false);
  console.log('Closing AI Assistant panel');
};

// Manejador para abrir el panel de asistente IA
const handleAIAssistantButtonClick = () => {
  setIsAIAssistantPanelOpen(true);
  console.log('Opening AI Assistant panel');
};

  // Función para limpiar las geometrías de colección
  const clearCollectionGeometries = () => {
    if (collectionGeometryHandler.isInitialized()) {
      collectionGeometryHandler.clear();
      console.log("Todas las geometrías de colección han sido eliminadas");
      
      // Notificar al usuario
      setNotification({
        message: 'Todas las geometrías de colección han sido eliminadas',
        type: 'info'
      });
      
      // Limpiar notificación después de unos segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      // Forzar actualización del renderizado
      if (state.fragments) {
        state.fragments.update(true);
      }
    }
  };

  const createRandomGeometry = () => {
    console.log("Creando geometrías aleatorias...");
    
    // Verificar que world y scene estén inicializados
    if (!state.world) {
      console.error("World no inicializado");
      setNotification({
        message: 'Error: El mundo 3D no está inicializado',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Obtener la escena - IMPORTANTE: usar scene.three para acceder a la escena de Three.js
    const scene = state.world.scene.three;
    
    if (!scene) {
      console.error("Scene no disponible");
      setNotification({
        message: 'Error: La escena Three.js no está disponible',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    try {
      // Configurar luces para las geometrías
      const setupLights = () => {
        // Verificar si ya existen luces
        const existingLights = scene.getObjectByName("randomGeometryLights");
        if (existingLights) {
          // Las luces ya están configuradas
          return;
        }
        
        // Crear un grupo para contener todas las luces
        const lightsGroup = new THREE.Group();
        lightsGroup.name = "randomGeometryLights";
        
        // Añadir luz ambiental
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        lightsGroup.add(ambientLight);
        
        // Añadir luz direccional principal
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(10, 10, 10);
        lightsGroup.add(mainLight);
        
        // Añadir luz de relleno desde otra dirección
        const fillLight = new THREE.DirectionalLight(0x9090ff, 0.4);
        fillLight.position.set(-10, 5, -10);
        lightsGroup.add(fillLight);
        
        // Añadir grupo de luces a la escena
        scene.add(lightsGroup);
      };
      
      // Configurar luces
      setupLights();
      
      // Grupo para contener todas las geometrías aleatorias
      const group = new THREE.Group();
      group.name = "randomGeometries";
      
      // Limpiar geometrías aleatorias existentes
      const existingGroup = scene.getObjectByName("randomGeometries");
      if (existingGroup) {
        scene.remove(existingGroup);
      }
      
      // Determinar tipo de geometría aleatoriamente
      const geometryTypes = ['box', 'sphere', 'cone', 'cylinder', 'torus', 'tetrahedron'];
      const count = Math.floor(Math.random() * 5) + 3; // Entre 3 y 7 geometrías
      
      // Crear geometrías aleatorias
      for (let i = 0; i < count; i++) {
        const geometryType = geometryTypes[Math.floor(Math.random() * geometryTypes.length)];
        let geometry;
        
        // Crear la geometría según el tipo seleccionado
        switch (geometryType) {
          case 'box':
            geometry = new THREE.BoxGeometry(
              Math.random() * 2 + 0.5,
              Math.random() * 2 + 0.5,
              Math.random() * 2 + 0.5
            );
            break;
          case 'sphere':
            geometry = new THREE.SphereGeometry(
              Math.random() * 1 + 0.5,
              16,
              16
            );
            break;
          case 'cone':
            geometry = new THREE.ConeGeometry(
              Math.random() * 1 + 0.5,
              Math.random() * 2 + 1,
              16
            );
            break;
          case 'cylinder':
            geometry = new THREE.CylinderGeometry(
              Math.random() * 1 + 0.5,
              Math.random() * 1 + 0.5,
              Math.random() * 2 + 1,
              16
            );
            break;
          case 'torus':
            geometry = new THREE.TorusGeometry(
              Math.random() * 1 + 0.5,
              Math.random() * 0.3 + 0.1,
              16,
              32
            );
            break;
          case 'tetrahedron':
            geometry = new THREE.TetrahedronGeometry(
              Math.random() * 1 + 0.5
            );
            break;
          default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        // Crear material con color aleatorio
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(Math.random(), Math.random(), Math.random()),
          metalness: Math.random() * 0.5,
          roughness: Math.random() * 0.5 + 0.5
        });
        
        // Crear mesh con la geometría y material
        const mesh = new THREE.Mesh(geometry, material);
        
        // Posición aleatoria (dentro de un rango razonable)
        mesh.position.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        );
        
        // Rotación aleatoria
        mesh.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );
        
        // Añadir al grupo
        group.add(mesh);
      }
      
      // Añadir grupo a la escena
      scene.add(group);
      
      // Notificar al usuario
      setNotification({
        message: `Creadas ${count} geometrías aleatorias`,
        type: 'success'
      });
      
      // Limpiar notificación después de unos segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      // Forzar actualización del renderizado
      if (state.fragments) {
        state.fragments.update(true);
      }
    } catch (error) {
      console.error("Error al crear geometrías aleatorias:", error);
      setNotification({
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteArtwork = async (artwork: ArtCollectionItemFormData) => {
    if (!artwork.itemId) return;
    
    try {
      // Llamar al servicio para eliminar
      const response = await artCollectionService.deleteItem(artwork.itemId);
      
      // Si hay geometrías de colección, eliminar también la geometría
      if (collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.removeCollectionGeometry(artwork.itemId);
      }
      
      // Cerrar el panel de detalles
      setIsArtworkDetailPanelOpen(false);
      
      // Refrescar la lista de obras de arte (opcional)
      if (isArtworksPanelOpen) {
        // Si tienes una función para recargar la lista, llámala aquí
        // Por ejemplo: reloadArtworksList();
      }
      
      // Mostrar notificación
      setNotification({
        message: `Obra "${artwork.name}" eliminada correctamente`,
        type: 'success'
      });
      
      // Limpiar la notificación después de unos segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      return response;
    } catch (error) {
      console.error('Error al eliminar la obra:', error);
      
      // Mostrar notificación de error
      setNotification({
        message: 'Error al eliminar la obra',
        type: 'error'
      });
      
      // Limpiar la notificación después de unos segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      throw error;
    }
  };
  
   // Preparar el modelo de datos del elemento seleccionado para el asistente IA
  const getSelectedElementDataForAI = () => {
  if (!selectedItem || !selectedItemData) return null;
  
  // Adaptar al formato que espera el servicio de IA
  return {
    id: selectedItem.localId,
    elementUuid: selectedItemData._guid?.value || selectedItemData.GlobalId?.value || null,
    elementName: selectedItemData.Name?.value || `Elemento ${selectedItem.localId}`,
    elementType: selectedItemData.ObjectType?.value || selectedItemData._category?.value || selectedItemData.type,
    category: selectedItemData._category?.value || null,
    type: selectedItemData._category?.value || selectedItemData.type || null,
    originalData: selectedItemData
  };
};

// Manejador para toggle del panel de FloorPlans
const handleFloorPlansPanelToggle = () => {
  setIsFloorPlansPanelOpen(prev => !prev);
  console.log(`${isFloorPlansPanelOpen ? 'Closing' : 'Opening'} FloorPlans panel`);
};

// Manejador para cerrar el panel de FloorPlans
const handleCloseFloorPlansPanel = () => {
  setIsFloorPlansPanelOpen(false);
  console.log('Closing FloorPlans panel');
};

  // Preparar los datos del modelo actual para el asistente IA
  const getCurrentModelDataForAI = () => {
  if (!state.models || state.models.length === 0) return null;
  
  // Crear una versión simple del modelo para el asistente IA
  return {
    name: state.models[0]?.name || 'Modelo sin nombre',
    type: state.models[0]?.type || 'Unknown',
    // Simplemente informar el número de modelos en lugar de contar todos los elementos
    modelCount: state.models.length,
    // Información adicional que no depende de getItemsCount
    lastModified: new Date().toLocaleDateString()
  };
};

// Función para recopilar datos del modelo para el asistente IA
// Implementación modificada de getModelElementsData inspirada en ElementInfoPanel.tsx
// Esta versión usa técnicas similares a las de getElementGuid y otras funciones del panel

const handleDirectNavigation = async (planId: string) => {
  console.log('🧭 === NAVEGACIÓN DIRECTA ===');
  console.log('Plan ID:', planId);
  
  try {
    const { FloorPlansService } = await import('./services/FloorPlansService');
    
    // Verificar que el servicio esté inicializado
    if (!FloorPlansService.isServiceInitialized()) {
      throw new Error('Servicio no inicializado');
    }
    
    // Navegar directamente
    await FloorPlansService.navigateToPlan(planId, true);
    
    console.log('✅ Navegación directa completada');
    setNotification({
      message: `🧭 Navegando directamente a plano: ${planId}`,
      type: 'info'
    });
    
    // Explicar qué debería ver
    setTimeout(() => {
      setNotification({
        message: '👀 Deberías ver: Vista 2D desde arriba, fondo blanco',
        type: 'info'
      });
    }, 1500);
    
    setTimeout(() => setNotification(null), 4000);
    
  } catch (error) {
    console.error('❌ Error en navegación directa:', error);
    setNotification({
      message: `Error navegando: ${error.message}`,
      type: 'error'
    });
    setTimeout(() => setNotification(null), 3000);
  }
};

// Función auxiliar para salida directa (agregar antes del return del componente)
const handleDirectExit = async () => {
  console.log('🚪 === SALIDA DIRECTA ===');
  try {
    const { FloorPlansService } = await import('./services/FloorPlansService');
    await FloorPlansService.exitPlanView();
    
    setNotification({
      message: '🔄 Volviendo a vista 3D normal',
      type: 'info'
    });
    setTimeout(() => setNotification(null), 3000);
  } catch (error) {
    console.error('❌ Error saliendo de vista:', error);
    setNotification({
      message: `Error: ${error.message}`,
      type: 'error'
    });
    setTimeout(() => setNotification(null), 3000);
  }
};



const getModelElementsData = async () => {
  if (!state.models || state.models.length === 0) {
    console.log("No hay modelos cargados para obtener datos de elementos");
    return {
      elementCounts: {},
      elementTypes: [],
      totalElements: 0,
      properties: {}
    };
  }
  
  console.log(`Iniciando extracción de datos de ${state.models.length} modelos...`);
  
  try {
    const elementCounts: Record<string, number> = {};
    const elementTypes: string[] = [];
    const properties: Record<string, any[]> = {};
    let totalElements = 0;
    
    // Función auxiliar para extraer el valor de una propiedad
    const extractPropertyValue = (data: any, propertyName: string): string => {
      if (!data) return '';
      
      // Caso 1: Propiedad directa en data
      if (data[propertyName] !== undefined) {
        const prop = data[propertyName];
        
        // Si es un objeto con valor
        if (typeof prop === 'object' && prop && prop.value !== undefined) {
          return typeof prop.value === 'string' ? prop.value : String(prop.value);
        }
        
        // Si es un valor directo
        if (typeof prop !== 'object' || prop === null) {
          return String(prop);
        }
      }
      
      // Caso 2: Dentro de properties
      if (data.properties && data.properties[propertyName] !== undefined) {
        const prop = data.properties[propertyName];
        
        // Si es un objeto con valor
        if (typeof prop === 'object' && prop && prop.value !== undefined) {
          return typeof prop.value === 'string' ? prop.value : String(prop.value);
        }
        
        // Si es un valor directo
        if (typeof prop !== 'object' || prop === null) {
          return String(prop);
        }
      }
      
      // Caso 3: Buscar en Psets comunes
      if (data.psets) {
        const psetNames = ['Pset_SpaceCommon', 'Pset_Common', 'Pset_Space', 'BaseQuantities'];
        
        for (const psetName of psetNames) {
          if (data.psets[psetName] && data.psets[psetName][propertyName] !== undefined) {
            const psetProp = data.psets[psetName][propertyName];
            
            // Si es un objeto con valor
            if (typeof psetProp === 'object' && psetProp && psetProp.value !== undefined) {
              return typeof psetProp.value === 'string' ? psetProp.value : String(psetProp.value);
            }
            
            // Si es un valor directo
            if (typeof psetProp !== 'object' || psetProp === null) {
              return String(psetProp);
            }
          }
        }
      }
      
      return '';

      
    };
    
    // Para cada modelo
    for (const model of state.models) {
      try {
        console.log(`Procesando modelo ${model.id || 'desconocido'}...`);
        
        // Obtener todas las categorías disponibles en el modelo
        const categories = await model.getCategories();
        console.log(`Categorías disponibles en modelo: [${categories.join(', ')}]`);
        
        // Procesar cada categoría
        for (const category of categories) {
          try {
            console.log(`Obteniendo elementos de categoría: ${category}`);
            
            // Obtener todos los elementos de esta categoría
            const items = await model.getItemsOfCategory(category);
            console.log(`  - Encontrados ${items.length} elementos de tipo ${category}`);
            
            if (items.length === 0) continue;
            
            // Actualizar conteo global
            if (!elementCounts[category]) {
              elementCounts[category] = 0;
              elementTypes.push(category);
              properties[category] = [];
            }
            
            elementCounts[category] += items.length;
            totalElements += items.length;
            
            // Analizar una muestra de elementos para guardar propiedades
            const sampleSize = Math.min(5, items.length);
            
            // Procesar cada elemento de muestra
            for (let i = 0; i < sampleSize; i++) {
              const item = items[i];
              
              try {
                // Obtener ID local
                const localId = await item.getLocalId();
                if (localId === null) continue;
                
                // Obtener GUID si es posible
                let guid = null;
                try {
                  guid = await item.getGuid();
                  console.log(`  - GUID obtenido para elemento ${localId}: ${guid}`);
                } catch (guidError) {
                  console.log(`  - No se pudo obtener GUID para elemento ${localId}`);
                }
                
                // Obtener datos completos
                const itemsData = await model.getItemsData([localId], {
                  includeGeometry: false,
                  includeMaterials: false,
                  includeProperties: true
                });
                
                // Verificar si obtuvimos datos
                if (!itemsData || itemsData.length === 0 || !itemsData[0]) continue;
                
                const data = itemsData[0];
                
                // Extraer propiedades básicas
                const name = extractPropertyValue(data, 'Name') || `Elemento ${localId}`;
                const longName = extractPropertyValue(data, 'LongName');
                const description = extractPropertyValue(data, 'Description');
                const objectType = extractPropertyValue(data, 'ObjectType');
                const globalId = guid || extractPropertyValue(data, 'GlobalId');
                
                // Extraer dimensiones si hay geometría
                let dimensions;
                try {
                  const boxes = await model.getBoxes([localId]);
                  if (boxes && boxes.length > 0) {
                    const box = boxes[0];
                    
                    const size = {
                      x: box.max.x - box.min.x,
                      y: box.max.y - box.min.y,
                      z: box.max.z - box.min.z
                    };
                    
                    dimensions = {
                      width: size.x,
                      height: size.y,
                      depth: size.z,
                      area: size.x * size.z,
                      volume: size.x * size.y * size.z
                    };
                  }
                } catch (boxError) {
                  console.log(`  - No se pudieron obtener dimensiones para elemento ${localId}`);
                }
                
                // Extraer todas las propiedades y organizarlas
                const psets = data.psets || {};
                
                // Crear objeto de propiedades organizado
                const elementProperties = {
                  id: localId,
                  name,
                  longName,
                  description,
                  objectType,
                  globalId,
                  category,
                  dimensions,
                  psets,
                  // Incluir datos brutos también para referencia
                  rawData: data
                };
                
                // Añadir a las propiedades de esta categoría
                properties[category].push(elementProperties);
              } catch (elementError) {
                console.warn(`  - Error procesando elemento de índice ${i}:`, elementError);
              }
            }
          } catch (categoryError) {
            console.warn(`Error procesando categoría ${category}:`, categoryError);
          }
        }
      } catch (modelError) {
        console.warn(`Error procesando modelo ${model.id}:`, modelError);
      }
    }
    
    console.log("=== RESUMEN DE DATOS EXTRAÍDOS ===");
    console.log(`Total elementos: ${totalElements}`);
    console.log(`Categorías: ${elementTypes.join(', ')}`);
    console.log("Conteo por categoría:", elementCounts);
    console.log("Propiedades ejemplares extraídas para cada categoría");
    
    return {
      elementCounts,
      elementTypes,
      totalElements,
      properties
    };
  } catch (error) {
    console.error("Error general en la extracción de datos:", error);
    return {
      elementCounts: {},
      elementTypes: [],
      totalElements: 0,
      properties: {}
    };
  }
};

const loadSpacesFromFragmentsModels = async (fragmentsModels: FRAGS.FragmentsModels): Promise<SpaceElement[]> => {
    const spaces: SpaceElement[] = [];
    
    if (!fragmentsModels || !fragmentsModels.models) {
      console.warn('FragmentsModels no disponible');
      return spaces;
    }

    try {
      const models = Array.from(fragmentsModels.models.list.values());
      console.log(`🏗️ Procesando ${models.length} modelos para extraer espacios...`);

      for (const model of models) {
        try {
          const categories = await model.getCategories();
          if (!categories.includes('IFCSPACE')) {
            console.log(`⚠️ Modelo ${model.id} no contiene espacios IFCSPACE`);
            continue;
          }

          const spaceItems = await model.getItemsOfCategory('IFCSPACE');
          console.log(`🏠 Encontrados ${spaceItems.length} espacios en modelo ${model.id}`);

          for (const spaceItem of spaceItems) {
            try {
              const localId = await spaceItem.getLocalId();
              if (localId === null) continue;

              let guid: string | null = null;
              try {
                guid = await spaceItem.getGuid();
              } catch (guidError) {
                console.warn(`No se pudo obtener GUID para espacio ${localId}`);
              }

              const itemsData = await model.getItemsData([localId], {
                includeProperties: true,
                includeGeometry: false,
                includeMaterials: false
              });

              if (!itemsData || itemsData.length === 0) continue;
              const data = itemsData[0];

              const name = extractPropertyValue(data, 'Name') || `Espacio ${localId}`;
              const longName = extractPropertyValue(data, 'LongName') || '';
              const description = extractPropertyValue(data, 'Description') || '';

              // Calcular dimensiones
              let dimensions;
              try {
                const boxes = await model.getBoxes([localId]);
                if (boxes && boxes.length > 0) {
                  const box = boxes[0];
                  dimensions = {
                    width: box.max.x - box.min.x,
                    height: box.max.y - box.min.y,
                    depth: box.max.z - box.min.z,
                    area: (box.max.x - box.min.x) * (box.max.z - box.min.z),
                    volume: (box.max.x - box.min.x) * (box.max.y - box.min.y) * (box.max.z - box.min.z)
                  };
                }
              } catch (boxError) {
                console.warn(`No se pudieron calcular dimensiones para espacio ${localId}`);
              }

              const spaceElement: SpaceElement = {
                modelId: model.id,
                localId,
                name,
                longName,
                position: dimensions ? {
                  x: dimensions.width / 2,
                  y: dimensions.height / 2, 
                  z: dimensions.depth / 2
                } : undefined,
                properties: {
                  globalId: guid || '',
                  longName,
                  description,
                  area: dimensions?.area,
                  volume: dimensions?.volume,
                  ...data
                }
              };

              spaces.push(spaceElement);

            } catch (spaceError) {
              console.warn(`Error procesando espacio individual:`, spaceError);
            }
          }
        } catch (modelError) {
          console.warn(`Error procesando modelo ${model.id}:`, modelError);
        }
      }

      console.log(`✅ Total espacios cargados: ${spaces.length}`);
      
      // ⭐ CRÍTICO: Actualizar cache en servicio de integración
      sensorSpaceIntegration.setSpacesCache(spaces);
      
      return spaces;
    } catch (error) {
      console.error('❌ Error general cargando espacios:', error);
      return spaces;
    }
  };

// 2. Función auxiliar para extraer valores de propiedades
const extractPropertyValue = (data: any, propertyName: string): string => {
  if (!data) return '';
  
  // Caso 1: Propiedad directa en data
  if (data[propertyName] !== undefined) {
    const prop = data[propertyName];
    
    // Si es un objeto IFCLABEL
    if (typeof prop === 'object' && prop && prop.type === 'IFCLABEL' && prop.value !== undefined) {
      return prop.value;
    }
    
    // Si es un objeto con valor
    if (typeof prop === 'object' && prop && prop.value !== undefined) {
      return typeof prop.value === 'string' ? prop.value : String(prop.value);
    }
    
    // Si es un valor directo
    if (typeof prop !== 'object' || prop === null) {
      return String(prop);
    }
  }
  
  // Caso 2: Dentro de properties
  if (data.properties && data.properties[propertyName] !== undefined) {
    const prop = data.properties[propertyName];
    
    // Si es un objeto con valor
    if (typeof prop === 'object' && prop && prop.value !== undefined) {
      return typeof prop.value === 'string' ? prop.value : String(prop.value);
    }
    
    // Si es un valor directo
    if (typeof prop !== 'object' || prop === null) {
      return String(prop);
    }
  }
  
  // Caso 3: Buscar en Psets comunes para espacios
  if (data.psets) {
    const psetNames = ['Pset_SpaceCommon', 'Pset_Space', 'BaseQuantities'];
    
    for (const psetName of psetNames) {
      if (data.psets[psetName] && data.psets[psetName][propertyName] !== undefined) {
        const psetProp = data.psets[psetName][propertyName];
        
        // Si es un objeto con valor
        if (typeof psetProp === 'object' && psetProp && psetProp.value !== undefined) {
          return typeof psetProp.value === 'string' ? psetProp.value : String(psetProp.value);
        }
        
        // Si es un valor directo
        if (typeof psetProp !== 'object' || psetProp === null) {
          return String(psetProp);
        }
      }
    }
  }
  
  return '';
};

// 3. Función auxiliar para navegar a espacios con sensores
const navigateToSpaceWithSensors = async (spaceGuid: string, spaceName: string) => {
  console.log(`🧭 Navegando a espacio con sensores: ${spaceName} (${spaceGuid})`);
  
  if (!state.models || state.models.length === 0) {
    console.warn('No hay modelos cargados');
    showNotification('No hay modelos cargados para navegar', 'error');
    return;
  }

  try {
    let spaceFound = false;
    
    // Buscar el espacio en todos los modelos
    for (const model of state.models) {
      const spaces = await model.getItemsOfCategory('IFCSPACE');
      
      for (const space of spaces) {
        const localId = await space.getLocalId();
        if (localId === null) continue;
        
        // Obtener GUID del espacio
        let guid: string | null = null;
        try {
          guid = await space.getGuid();
        } catch (guidError) {
          continue;
        }
        
        // Comparar GUIDs (normalizar formato)
        const cleanTargetGuid = spaceGuid.replace(/[-_]/g, '').toLowerCase();
        const cleanFoundGuid = (guid || '').replace(/[-_]/g, '').toLowerCase();
        
        if (guid === spaceGuid || cleanFoundGuid === cleanTargetGuid) {
          console.log(`✅ Espacio encontrado: ${spaceName}`);
          spaceFound = true;
          
          // Seleccionar el espacio
          selectElementAndShowProperties({ model, localId });
          
          // Obtener datos de temperatura si el heatmap está activo
          const spaceData = heatMap.getSpaceData(spaceGuid);
          const temperature = heatMap.getSpaceTemperature(spaceGuid);
          
          // Aplicar zoom con opciones especiales para sensores
          const zoomOptions = {
            zoomFactor: 2.5,
            showBoundingBox: true,
            boundingBoxDuration: 4000,
            boundingBoxColor: temperature && temperature > 24 ? 0xff4444 : 
                             temperature && temperature < 20 ? 0x4444ff : 0x44ff44,
            highlightElement: true,
            onlyShowBoundingBox: false
          };
          
          try {
            await zoomToElement(model, localId, state.world, state.fragments, zoomOptions);
            await state.fragments?.update(true);
            
            const tempInfo = temperature ? ` (🌡️ ${temperature.toFixed(1)}°C)` : '';
            showNotification(`🌡️ Navegando a espacio: ${spaceName}${tempInfo}`, 'success');
            
          } catch (zoomError) {
            console.error('Error aplicando zoom:', zoomError);
            showNotification(`Espacio encontrado pero error al enfocar: ${spaceName}`, 'warning');
          }
          
          return;
        }
      }
    }
    
    if (!spaceFound) {
      console.warn(`No se encontró el espacio: ${spaceGuid}`);
      showNotification(`No se encontró el espacio: ${spaceName}`, 'error');
    }
    
  } catch (error) {
    console.error('Error navegando a espacio con sensores:', error);
    showNotification(`Error navegando a espacio: ${error.message}`, 'error');
  }
};

// 4. Función para obtener datos del modelo para el chatbot (respaldo)
const getModelElementsForChatBot = async () => {
  // Datos simulados básicos para el asistente cuando no se pueden extraer datos reales
  return {
    elementCounts: {
      "IFCWALL": 45,
      "IFCDOOR": 12,
      "IFCWINDOW": 18,
      "IFCSPACE": 8,
      "IFCFURNITURE": 25,
      "IFCSLAB": 6,
      "IFCCOLUMN": 8,
      "IFCBEAM": 15
    },
    elementTypes: ["IFCWALL", "IFCDOOR", "IFCWINDOW", "IFCSPACE", "IFCFURNITURE", "IFCSLAB", "IFCCOLUMN", "IFCBEAM"],
    totalElements: 137,
    properties: {
      "IFCSPACE": [
        {
          id: 1001,
          name: "Oficina Principal",
          longName: "Oficina Principal - Planta Baja",
          description: "Espacio de trabajo principal",
          area: 45.5,
          volume: 136.5,
          category: "IFCSPACE"
        },
        {
          id: 1002, 
          name: "Sala de Reuniones",
          longName: "Sala de Reuniones Norte",
          description: "Espacio para reuniones",
          area: 25.0,
          volume: 75.0,
          category: "IFCSPACE"
        }
      ]
    }
  };
};

// 5. Función para definir el espacio seleccionado (agregar como variable)
const selectedSpace = selectedItem && selectedItemData && selectedItemData._category?.value === 'IFCSPACE' 
  ? {
      guid: selectedItemData._guid?.value || selectedItemData.GlobalId?.value,
      name: selectedItemData.Name?.value || 'Espacio sin nombre',
      longName: selectedItemData.LongName?.value || ''
    }
  : null;


const getSpacesDataForChatbot = async () => {
  if (!state.models || state.models.length === 0) {
    console.log("No hay modelos cargados para obtener datos de espacios");
    return {
      elementCounts: { "IFCSPACE": 0 },
      elementTypes: ["IFCSPACE"],
      totalElements: 0,
      properties: { "IFCSPACE": [] }
    };
  }
  
  console.log(`Iniciando extracción de datos de ESPACIOS de ${state.models.length} modelos...`);
  
  try {
    const spaces: any[] = [];
    let totalSpaces = 0;
    
    // Función auxiliar para extraer el valor de una propiedad (igual que en CollectionsPanel)
    const extractPropertyValue = (data: any, propertyName: string): string => {
      if (!data) return '';
      
      // Caso 1: Propiedad directa en data
      if (data[propertyName] !== undefined) {
        const prop = data[propertyName];
        
        // Si es un objeto IFCLABEL
        if (typeof prop === 'object' && prop && prop.type === 'IFCLABEL' && prop.value !== undefined) {
          return prop.value;
        }
        
        // Si es un objeto con valor
        if (typeof prop === 'object' && prop && prop.value !== undefined) {
          return typeof prop.value === 'string' ? prop.value : String(prop.value);
        }
        
        // Si es un valor directo
        if (typeof prop !== 'object' || prop === null) {
          return String(prop);
        }
      }
      
      // Caso 2: Dentro de properties
      if (data.properties && data.properties[propertyName] !== undefined) {
        const prop = data.properties[propertyName];
        
        // Si es un objeto con valor
        if (typeof prop === 'object' && prop && prop.value !== undefined) {
          return typeof prop.value === 'string' ? prop.value : String(prop.value);
        }
        
        // Si es un valor directo
        if (typeof prop !== 'object' || prop === null) {
          return String(prop);
        }
      }
      
      // Caso 3: Buscar en Psets comunes para espacios
      if (data.psets) {
        const psetNames = ['Pset_SpaceCommon', 'Pset_Space', 'BaseQuantities'];
        
        for (const psetName of psetNames) {
          if (data.psets[psetName] && data.psets[psetName][propertyName] !== undefined) {
            const psetProp = data.psets[psetName][propertyName];
            
            // Si es un objeto con valor
            if (typeof psetProp === 'object' && psetProp && psetProp.value !== undefined) {
              return typeof psetProp.value === 'string' ? psetProp.value : String(psetProp.value);
            }
            
            // Si es un valor directo
            if (typeof psetProp !== 'object' || psetProp === null) {
              return String(psetProp);
            }
          }
        }
      }
      
      return '';
    };
    
    // Función para extraer todas las propiedades de un espacio IFC
    const extractSpaceProperties = async (model: any, localId: number) => {
      if (!model || localId === null) {
        return null;
      }
      
      try {
        // Obtener el fragmentItem para acceder a getGuid()
        const items = await model.getItemsOfCategory('IFCSPACE');
        let fragmentItem = null;
        let guid = null;
        
        // Buscar el item con el localId correspondiente
        for (const item of items) {
          const itemLocalId = await item.getLocalId();
          if (itemLocalId === localId) {
            fragmentItem = item;
            break;
          }
        }
        
        // Si encontramos el item, obtenemos el GUID directamente
        if (fragmentItem) {
          try {
            guid = await fragmentItem.getGuid();
            console.log(`Obtenido GUID para espacio ${localId}: ${guid}`);
          } catch (guidError) {
            console.log(`No se pudo obtener GUID directamente para espacio ${localId}:`, guidError);
          }
        }
        
        // Obtener datos completos con todas las propiedades
        const itemsData = await model.getItemsData([localId], {
          includeGeometry: false,
          includeMaterials: false,
          includeProperties: true
        });
        
        // Verificar que obtuvimos datos
        if (!itemsData || itemsData.length === 0 || !itemsData[0]) {
          return null;
        }
        
        const data = itemsData[0];
        
        // Extraer propiedades básicas
        const name = extractPropertyValue(data, 'Name') || `Espacio ${localId}`;
        const longName = extractPropertyValue(data, 'LongName');
        const description = extractPropertyValue(data, 'Description');
        const objectType = extractPropertyValue(data, 'ObjectType');
        
        // Utilizar el GUID que obtuvimos directamente o como respaldo obtenerlo de las propiedades
        const globalId = guid || extractPropertyValue(data, 'GlobalId');
        
        // Crear objeto de propiedades
        const properties = {
          name,
          longName,
          description,
          objectType,
          globalId,
          psets: data.psets || {},
          rawData: data
        };
        
        return properties;
      } catch (error) {
        console.error(`Error al extraer propiedades del espacio ${localId}:`, error);
        return null;
      }
    };
    
    // Para cada modelo
    for (const model of state.models) {
      try {
        console.log(`Analizando modelo ${model.id || 'desconocido'}...`);
        
        // Verificar si el modelo tiene la categoría IFCSPACE
        const categories = await model.getCategories();
        
        if (!categories.includes('IFCSPACE')) {
          console.log(`El modelo ${model.id || 'desconocido'} no contiene espacios`);
          continue;
        }
        
        // Obtener todos los elementos IFCSPACE
        const items = await model.getItemsOfCategory('IFCSPACE');
        console.log(`Encontrados ${items.length} espacios en modelo ${model.id || 'desconocido'}`);
        totalSpaces += items.length;
        
        // Procesar cada espacio
        for (const item of items) {
          try {
            const localId = await item.getLocalId();
            if (localId === null) continue;
            
            // Extraer propiedades completas del espacio
            const properties = await extractSpaceProperties(model, localId);
            if (!properties) continue;
            
            // Calcular dimensiones geométricas
            let dimensions;
            try {
              const boxes = await model.getBoxes([localId]);
              if (boxes && boxes.length > 0) {
                const box = boxes[0];
                
                const size = {
                  x: box.max.x - box.min.x,
                  y: box.max.y - box.min.y,
                  z: box.max.z - box.min.z
                };
                
                dimensions = {
                  width: size.x,
                  height: size.y,
                  depth: size.z,
                  area: size.x * size.z,
                  volume: size.x * size.y * size.z
                };
                
                // Guardar volumen y área en las propiedades
                if (properties) {
                  properties.area = dimensions.area;
                  properties.volume = dimensions.volume;
                }
              }
            } catch (error) {
              console.log(`No se pudieron obtener dimensiones para espacio ${localId}`);
            }
            
            // Crear elemento de espacio
            const spaceElement = {
              modelId: model.id,
              localId,
              category: 'IFCSPACE',
              name: properties.name,
              longName: properties.longName || '',
              dimensions,
              properties
            };
            
            spaces.push(spaceElement);
          } catch (error) {
            console.warn(`Error procesando espacio:`, error);
          }
        }
      } catch (error) {
        console.warn(`Error procesando modelo ${model.id || 'desconocido'}:`, error);
      }
    }
    
    console.log(`=== EXTRACCIÓN DE ESPACIOS COMPLETADA ===`);
    console.log(`Total espacios encontrados: ${totalSpaces}`);
    
    // Formatear la salida para el asistente IA
    return {
      elementCounts: { "IFCSPACE": totalSpaces },
      elementTypes: ["IFCSPACE"],
      totalElements: totalSpaces,
      properties: { "IFCSPACE": spaces }
    };
  } catch (error) {
    console.error("Error general en la extracción de espacios:", error);
    return {
      elementCounts: { "IFCSPACE": 0 },
      elementTypes: ["IFCSPACE"],
      totalElements: 0,
      properties: { "IFCSPACE": [] }
    };
  }
};

// Añade este useEffect para cargar los datos cuando cambian los modelos
useEffect(() => {
  const loadElementsData = async () => {
    if (state.models && state.models.length > 0) {
      try {
        console.log("Iniciando recopilación de datos para el asistente IA...");
        
        // Paso 1: Intentar con la función de diagnóstico profundo
        console.log("Intento #1: Usando método de diagnóstico profundo");
        let data = await getModelElementsData();
        
        // Verificar si obtuvimos datos reales
        const hasRealData = data && 
                         data.elementTypes && 
                         data.elementTypes.length > 0 && 
                         Object.keys(data.elementCounts).length > 0;
        
        // Si no tenemos datos reales, intentar con el método de respaldo
        if (!hasRealData) {
          console.log("Intento #2: No se obtuvieron datos reales, usando método de respaldo");
          data = await getModelElementsForChatBot();
          console.log("Datos de respaldo generados:", data);
        }
        
        if (data) {
          setElementsData(data);
          console.log("Datos del modelo cargados para asistente IA:", data);
          
          // Calcular el total real
          const total = Object.values(data.elementCounts).reduce((sum, count) => sum + (count || 0), 0);
          
          if (total > 0) {
            console.log(`Total de elementos identificados: ${total}`);
          } else {
            console.warn("No se encontraron elementos con conteo > 0");
          }
        }
      } catch (error) {
        console.error("Error al cargar datos de elementos:", error);
        
        // Si falla todo, usar datos simulados básicos
        try {
          console.log("Intento #3: Usando datos simulados mínimos");
          const fallbackData = await getModelElementsForChatBot();
          setElementsData(fallbackData);
          console.log("Datos de respaldo mínimos generados:", fallbackData);
        } catch (fallbackError) {
          console.error("Error incluso con datos simulados:", fallbackError);
        }
      }
    } else {
      console.warn("No hay modelos cargados. No se pueden cargar datos de elementos.");
    }
  };
  
  loadElementsData();
}, [state.models]);



// Función actualizada para obtener datos para el asistente IA
const getContextDataForAI = async () => {
  // Obtener datos del elemento seleccionado
  const selectedElementData = getSelectedElementDataForAI();
  
  // Obtener datos del modelo actual
  const modelData = getCurrentModelDataForAI();
  
  // Obtener datos de elementos específicos del modelo
  const elementsData = await getModelElementsData();
  
  return {
    selectedElement: selectedElementData,
    modelInfo: modelData,
    elementsData: elementsData
  };
}; 

const reloadModelData = async () => {
  if (state.models && state.models.length > 0) {
    setNotification({
      message: 'Recargando datos del modelo...',
      type: 'info'
    });
    
    try {
      // Paso 1: Intentar con el método de diagnóstico
      console.log("Recargar: Intento con diagnóstico profundo");
      let data = await getModelElementsData();
      
      // Verificar si obtuvimos datos reales
      const hasRealData = data && 
                         data.elementTypes && 
                         data.elementTypes.length > 0 && 
                         Object.keys(data.elementCounts).length > 0;
      
      // Si no hay datos reales, usar respaldo
      if (!hasRealData) {
        console.log("Recargar: Usando método de respaldo");
        data = await getModelElementsForChatBot();
      }
      
      // Actualizar estado
      setElementsData(data);
      
      // Mostrar notificación adecuada
      const totalElements = Object.values(data.elementCounts).reduce((sum, count) => sum + (count || 0), 0);
      
      if (hasRealData) {
        setNotification({
          message: `Datos reales recargados: ${totalElements} elementos en ${data.elementTypes.length} categorías`,
          type: 'success'
        });
      } else {
        setNotification({
          message: `Datos simulados cargados para el asistente: ${totalElements} elementos`,
          type: 'info'
        });
      }
      
      console.log("Datos recargados:", data);
    } catch (error) {
      console.error("Error al recargar datos:", error);
      setNotification({
        message: 'Error al recargar datos del modelo',
        type: 'error'
      });
    }
    
    setTimeout(() => setNotification(null), 5000);
  } else {
    console.warn("No hay modelos cargados para recargar datos");
    setNotification({
      message: 'No hay modelos cargados para recargar datos',
      type: 'error'
    });
    setTimeout(() => setNotification(null), 3000);
  }
};
  

  // Renderizado del componente
  return (
    <div className="w-full h-full min-h-[400px] relative flex flex-col">
      {/* Container where Three.js scene will be rendered */}
      <div
        ref={containerRef}
        className={`w-full h-full min-h-[400px] flex-grow bg-gray-950  overflow-hidden ${
          elementSelectionLocked ? 'cursor-not-allowed' : 'cursor-default'
        }`}
        style={{ 
          minHeight: '400px',
          height: containerSize.height || '70vh'
        }}
        onMouseDown={() => setMouseDownTime(Date.now())}
        onMouseUp={(e) => {
          const duration = Date.now() - mouseDownTime;
          if (duration < 100) {
            handleNormalClick(e); // Solo llama tu función si fue click rápido
          }
          setMouseDownTime(0);
        }}
      />

      {/* Notification message */}
      {notification && (
        <div className={`absolute top-4 right-4 z-50 p-3 rounded-md shadow-lg text-sm max-w-xs ${
          notification.type === 'success' ? 'bg-green-900/90 text-green-50 border border-green-700' :
          notification.type === 'error' ? 'bg-red-900/90 text-red-50 border border-red-700' :
          'bg-blue-900/90 text-blue-50 border border-blue-700'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Contenedor de la barra de herramientas */}
      <div className="toolbar-container" style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        display: 'flex', 
        justifyContent: 'center',
        zIndex: 1000
      }}>
        {/* Integrated ModelToolbar component */}
        {showToolbar && (
          <ModelToolbar 
            onCenterModel={centerModel} 
            models={state.models} 
            fragments={state.fragments}
            onSectionClick={handleToolbarSectionClick}
            selectedItem={selectedItem}
            onPropertyPanelToggle={handlePropertyPanelToggle}
            onInventoryClick={handleInventoryButtonClick}
            onSpacesPanelToggle={handleSpacesPanelToggle}
            onArtworksClick={handleArtworksButtonClick}
            onAIAssistantToggle={handleAIAssistantButtonClick}
            onSensorsPanelToggle={handleSensorsPanelToggle}
            world={state.world}
            // PROPS ACTUALIZADAS PARA HEATMAP
            onHeatmapPanelToggle={handleHeatmapPanelToggle}
            onHeatMapTestToggle={() => setIsHeatMapTestPanelOpen(prev => !prev)}
            hasHeatmapData={heatMap.hasData}
            isHeatmapActive={heatMap.isActive}
            onIoTPredictiveToggle={handleIoTPredictiveToggle}
            onIoTReportsToggle={handleIoTReportsToggle}
          />
        )}
      </div>
        
      {/* Integrated ViewerToolbar component */}
      {showToolbar && (
        <ViewerToolbar 
          onCenterModel={centerModel} 
          models={state.models} 
          fragments={state.fragments}
          onToggleIsolationPanel={handleToggleIsolationPanel}
          isIsolationActive={isolatedCategory !== null}
          onAddRandomGeometry={createRandomGeometry} 
          onRemoveRandomGeometry={removeRandomGeometries}
          onClearCollectionGeometries={clearCollectionGeometries}
          hasCollectionGeometries={hasCollectionGeometries}
          world={state.world} // CRÍTICO: Pasar world
          components={components} // NUEVO: Pasar components
          onToggleFloorPlansPanel={handleFloorPlansGeneratorToggle} // NUEVO: Handler específico
          isFloorPlansActive={isFloorPlansGeneratorOpen} // NUEVO: Estado activo
        />
      )}

      
        
      {/* ElementIsolationManager component */}
      {isIsolationPanelOpen && (
        <ElementIsolationManager
          models={state.models}
          fragments={state.fragments}
          world={state.world}
          onCategoryIsolated={handleCategoryIsolated}
          nonIsolatedOpacity={0.15} // Valor personalizable (15% de opacidad para elementos no aislados)
          onClose={() => setIsIsolationPanelOpen(false)}
        />
      )}
      
      {/* ModelSidebar component */}
      <ModelSidebar 
        isOpen={isModelSidebarOpen}
        onClose={() => setIsModelSidebarOpen(false)}
        onModelUrlsChange={handleModelUrlsChangeWithNotification}
        loadedModelUrls={loadedModelUrls}
      />
      {/* Panel de Inventario */}
      {isInventoryPanelOpen && (
        <InventoryPanel 
          models={state.models}
          fragments={state.fragments}
          world={state.world}
          onElementSelected={handleInventoryElementSelect}
          onElementIsolated={handleInventoryElementIsolated}
          onResetIsolation={handleResetIsolation}
          isSelectionLocked={elementSelectionLocked}
          currentIsolatedCategory={isolatedCategory}
          onShowElementInfo={(element) => {
            setShowPropertyPanel(true);
            setShowToolbar(false);
            selectElementAndShowProperties(element);
          }}
          onClose={() => setIsInventoryPanelOpen(false)}
        />
      )}
      
      {/* Panel de Espacios con soporte para geometrías de colección */}
      {isSpacesPanelOpen && (
        <SpacesPanel 
          models={state.models}
          fragments={state.fragments}
          world={state.world}
          onElementSelected={handleSpaceElementSelect}
          onShowElementInfo={(element) => {
            setShowPropertyPanel(true);
            setShowToolbar(false);
            selectElementAndShowProperties(element);
          }}
          onClose={handleCloseSpacesPanel}
          onSpaceSelected={(spaceData) => {
            if (spaceData.properties?.globalId && collectionGeometryHandler.isInitialized()) {
              collectionGeometryHandler.showOnlySpaceGeometries(spaceData.properties.globalId);
            }
          }}
          hasCollectionGeometries={hasCollectionGeometries}
          // NUEVAS PROPS PARA INTEGRACIÓN CON SENSORES
          spacesWithSensors={spacesForSensors.filter(space => 
            sensorSpaceIntegration.getSensorsBySpace(space.properties?.globalId || '').length > 0
          )}
          onNavigateToSpaceWithSensors={navigateToSpaceWithSensors}
        />
      )}

      {/* Panel de ArtworksPanel */}
      {isArtworksPanelOpen && (
        <ArtworksPanel 
          onClose={() => setIsArtworksPanelOpen(false)}
          onSpaceSelected={handleSpaceWithArtworksSelected}
          onArtworkInfoRequest={handleArtworkInfoRequest}
          models={state.models}
          fragments={state.fragments}
          world={state.world}
        />
      )}

      {/* Panel de ArtworkDetailPanel */}
      {isArtworkDetailPanelOpen && selectedArtwork && (
        <ArtworkDetailPanel 
          artwork={selectedArtwork}
          onClose={handleCloseArtworkDetailPanel}
          onUpdateStatus={handleUpdateArtworkStatus}
          // Añadir esta nueva prop:
          onDelete={handleDeleteArtwork}
        />
      )}

      {isActivitiesPanelOpen && (
        <ActivitiesPanel 
          onClose={handleCloseActivitiesPanel}
          onSpaceSelected={(spaceGuid, spaceName, spaceLongName) => {
            handleSpaceWithArtworksSelected(spaceGuid, spaceName);
          }}
          onActivityInfoRequest={(activity) => {
            console.log('Activity info requested:', activity);
          }}
          models={state.models}
          fragments={state.fragments}  // ⭐ AGREGAR ESTA LÍNEA
          world={state.world}          // ⭐ AGREGAR ESTA LÍNEA
        />
      )}
      
      {/* Panel de ElementInfo */}
      {isElementInfoPanelOpen && selectedItem && (
        <ElementInfoPanel 
          selectedElement={selectedItem}
          onClose={handleCloseElementInfoPanel}
          elementData={selectedItemData}
        />
      )}

      {/* Panel de Asistente IA */}
      {isAIAssistantPanelOpen && (
          <AIAssistantPanel
            isOpen={isAIAssistantPanelOpen}
            onClose={handleCloseAIAssistantPanel}
            selectedElement={getSelectedElementDataForAI()}
            modelData={getCurrentModelDataForAI()}
            elementsData={elementsData} 
            onReloadModelData={reloadModelData}
            aiAgent={aiAgent} // Aquí se pasa el agente IA inicializado
        />
      )}

        {/* Floor Plans Generator Panel - VERSIÓN CORREGIDA */}
        {isFloorPlansGeneratorOpen && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Planos de Planta 2D</h2>
                <button
                  onClick={() => setIsFloorPlansGeneratorOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                {/* USAR SimpleFloorPlansGenerator en lugar de FloorPlansGenerator */}
                <SimpleFloorPlansGenerator
                  world={state.world}
                  fragments={state.fragments}
                  models={state.models}
                  components={components}
                  onPlanGenerated={(plans) => {
                    console.log('✅ Planos generados en BIMViewerPage:', plans);
                    setNotification({
                      message: `✅ Generados ${plans.length} planos de planta`,
                      type: 'success'
                    });
                    setTimeout(() => setNotification(null), 3000);
                  }}
                  onError={(error) => {
                    console.error('❌ Error en generación de planos:', error);
                    setNotification({
                      message: `❌ Error: ${error}`,
                      type: 'error'
                    });
                    setTimeout(() => setNotification(null), 5000);
                  }}
                  onPlanNavigated={(planId, planName) => {
                    // Buscar el plan en los datos generados
                    const planData = currentFloorPlan || { 
                      name: planName, 
                      level: 0, 
                      boundingBox: { min: { x: -10, y: 0, z: -10 }, max: { x: 10, y: 3, z: 10 } } 
                    };
                    
                    // Activar modo 2D
                    handle2DModeChange(true, planData);
                    
                    setNotification({
                      message: `🧭 Navegando a: ${planName}`,
                      type: 'info'
                    });
                    setTimeout(() => setNotification(null), 3000);
                  }}
                  onExitPlanView={() => {
                    // Salir de modo 2D
                    handle2DModeChange(false);
                    
                    setNotification({
                      message: '🔄 Volviendo a vista 3D',
                      type: 'info'
                    });
                    setTimeout(() => setNotification(null), 3000);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        // 6. INDICADOR visual del modo 2D en la UI
        {/* Indicador de modo 2D */}
        {isIn2DMode && (
          <div className="absolute top-16 left-4 z-10 bg-blue-600/90 text-white px-3 py-1 rounded-full text-xs font-medium">
            📐 Modo 2D: {currentFloorPlan?.name || 'Plano activo'}
          </div>
        )}

      {isSensorsPanelOpen && (
        <EnhancedSensorsPanelMain
          isOpen={isSensorsPanelOpen}
          onClose={handleSensorsPanelToggle}
          selectedSpace={selectedSpace}
          // INTEGRACIÓN 3D ACTUALIZADA
          spaces={spacesForSensors}
          world={state.world}
          fragments={state.fragments}
          models={state.models}
          // NUEVAS PROPS PARA HEATMAP
          heatMapHook={heatMap}
        />
      )}

      {/* ⭐ NUEVOS PANELES IoT */}
      {isIoTPredictivePanelOpen && (
        <IoTPredictiveTab
          selectedElement={getSelectedElementDataForAI()}
          modelData={getCurrentModelDataForAI()}
          elementsData={elementsData}
          isLoading={false}
          setIsLoading={() => {}}
          error={null}
          setError={() => {}}
          messages={[]}
          setMessages={() => {}}
          setActiveTab={() => {}}
          generateUniqueId={generateUniqueId}
        />
      )}

      {isIoTReportsPanelOpen && (
        <IoTReportsTab
          selectedElement={getSelectedElementDataForAI()}
          modelData={getCurrentModelDataForAI()}
          elementsData={elementsData}
          isLoading={false}
          setIsLoading={() => {}}
          error={null}
          setError={() => {}}
          messages={[]}
          setMessages={() => {}}
          setActiveTab={() => {}}
          generateUniqueId={generateUniqueId}
        />
      )}

      {/* Panel de prueba HeatMap */}
        {isHeatMapTestPanelOpen && (
          <SimpleHeatMapTestPanel
            isOpen={isHeatMapTestPanelOpen}
            onClose={() => setIsHeatMapTestPanelOpen(false)}
            models={state.models}
            fragments={state.fragments}
            world={state.world}
            position="right"
          />
        )}

      {/* ⭐ NUEVO: Overlay de información del HeatMap */}
      {showHeatMapInfo && (
        <HeatMapInfoOverlay
          selectedElement={selectedItem}
          selectedElementData={selectedItemData}
          isHeatMapActive={heatMap.isActive}
          heatMapData={heatMap.currentData ? new Map(
            heatMap.currentData.map(item => [item.spaceGuid, item])
          ) : new Map()}
          position="top-right"
          useTestData={true} // Cambiar a false cuando tengas backend real
        />
      )}
      
      {/* Loading and error states */}
      {(state.isLoading || isLoadingModels) && (
        <LoadingOverlay 
          status={isLoadingModels ? 'Cargando modelos...' : state.status} 
        />
      )}
      {state.error && <ErrorOverlay error={state.error} />}
      
      {!state.isLoading && !state.error && (
        <>
          {/* Model count indicator - ACTUALIZADO */}
          <div className="absolute top-4 left-4 z-10 bg-gray-800/80 backdrop-blur-sm py-1 px-2 rounded text-xs text-gray-300">
            {state.models.length > 0 ? (
              <>Models loaded: {state.models.length}</>
            ) : (
              <>No models loaded</>
            )}
            
            {/* Indicador de mapa de calor */}
            {heatMap.isActive && (
              <> | <span className="text-red-400">🌡️ HeatMap Active ({heatMap.dataCount})</span></>
            )}
            
            {/* Indicador de geometrías de colección */}
            {hasCollectionGeometries && (
              <> | <span className="text-blue-300">Geometrías de colección activas</span></>
            )}
          </div>
          
          {/* Debug info - ACTUALIZADO para mostrar estado de bloqueo */}
          <div className="absolute bottom-4 left-4 z-10 bg-gray-800/80 backdrop-blur-sm py-1 px-2 rounded text-xs text-gray-300">
            {selectedItem ? (
              <>Selected: Model {selectedItem.model.id}, ExpressID: {selectedItem.localId}</>
            ) : (
              <>No element selected</>
            )}
            {isolatedCategory && (
              <> | Isolated: {isolatedCategory}</>
            )}
            {elementSelectionLocked && (
              <> | <span className="text-yellow-300">Selection locked</span></>
            )}
          </div>
          
          {/* PropertySets panel */}
          {showPropertyPanel && selectedItemData && (
            <PropertyPanel 
              selectedItemData={selectedItemData} 
              onClose={handleClosePropertyPanel}
              formattedPsets={formattedPsets}
            />
          )}
        </>
      )}
    </div>
  );
};



export default BIMViewerPage;