"use client";

import React from 'react';
import { X } from 'lucide-react';
import './styles/toolbar.css';

// Importaciones de componentes
import { ToolbarButtons } from './UI/ToolbarButtons';
import { VisibilityPanel } from './ViewerPanels/VisibilityPanel';
import { LayersPanel } from './ViewerPanels/LayersPanel';
import { GeometryPanel } from './ViewerPanels/GeometryPanel';
import { AddPanel } from './ViewerPanels/AddPanel';
import { NotificationToast } from './UI/NotificationToast';
import SimpleFloorPlansGenerator from './utils/SimpleFloorPlansGenerator';

// Importaciones de tipos y hooks
import { ViewerToolbarProps } from './types/ViewerToolbarTypes';
import { useViewerToolbar } from './hooks/useViewerToolbar';

const ViewerToolbar: React.FC<ViewerToolbarProps> = (props) => {
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
    setSearchTerm,
    setLayerSearchTerm,
    togglePanel,
    handleCenterClick,
    handleIsolationClick,
    handleFloorPlansClick,
    toggleCategoryVisibility,
    showAllCategories,
    hideAllCategories,
    toggleLayerVisibility,
    showAllLayers,
    hideAllLayers,
    createRandomGeometry,
    removeRandomGeometries,
    isIsolationActive,
    isFloorPlansActive,
    models,
    onClearCollectionGeometries
  } = useViewerToolbar(props);

  const getPanelTitle = () => {
    switch (activePanel) {
      case 'add': return "Añadir Elementos";
      case 'layers': return "Capas por Especialidad";
      case 'visibility': return "Visibilidad por Categoría";
      case 'geometry': return "Geometrías 3D Aleatorias";
      case 'floorplans': return "Planos de Planta 2D";
      default: return "";
    }
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'add':
        return <AddPanel />;
        
      case 'layers':
        return (
          <LayersPanel
            layerSearchTerm={layerSearchTerm}
            setLayerSearchTerm={setLayerSearchTerm}
            layersVisibility={layersVisibility}
            isLoadingLayers={isLoadingLayers}
            onToggleLayerVisibility={toggleLayerVisibility}
            onShowAllLayers={showAllLayers}
            onHideAllLayers={hideAllLayers}
          />
        );
        
      case 'visibility':
        return (
          <VisibilityPanel
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            modelCategories={modelCategories}
            categoriesVisibility={categoriesVisibility}
            isLoading={isLoading}
            errorMessage={errorMessage}
            models={models}
            onToggleCategoryVisibility={toggleCategoryVisibility}
            onShowAllCategories={showAllCategories}
            onHideAllCategories={hideAllCategories}
          />
        );
        
      case 'geometry':
        return (
          <GeometryPanel
            hasRandomGeometries={hasRandomGeometries}
            isLoading={isLoading}
            onCreateRandomGeometry={createRandomGeometry}
            onRemoveRandomGeometries={removeRandomGeometries}
            onClearCollectionGeometries={onClearCollectionGeometries}
          />
        );

      case 'floorplans':
        return (
          <SimpleFloorPlansGenerator
            world={props.world}
            fragments={props.fragments}
            models={models}
            components={props.components}
            onPlanGenerated={(plans) => {
              console.log('Planos generados:', plans);
              // Aquí puedes agregar lógica adicional si necesitas
            }}
            onError={(error) => {
              console.error('Error en generación de planos:', error);
              // El componente ya maneja la notificación de errores internamente
            }}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="viewer-interface">
      {/* Barra de herramientas principal */}
      <div className="viewer-toolbar" style={{ right: '250px', left: 'auto' }}>
        <ToolbarButtons
          activePanel={activePanel}
          onTogglePanel={togglePanel}
          onCenterModel={handleCenterClick}
          onToggleIsolation={handleIsolationClick}
          isIsolationActive={isIsolationActive}
          onToggleFloorPlans={handleFloorPlansClick}
          isFloorPlansActive={isFloorPlansActive}
        />
      </div>

      {/* Paneles de herramientas */}
      {activePanel && (
        <div className="toolbar-panel" style={{ right: '300px', left: 'auto' }}>
          <div className="panel-header">
            <h3>{getPanelTitle()}</h3>
            <button 
              className="close-button"
              onClick={() => togglePanel(activePanel)}
              aria-label="Cerrar panel"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="panel-content">
            {renderPanelContent()}
          </div>
        </div>
      )}
      
      {/* Notificación flotante */}
      <NotificationToast notification={notification} />
    </div>
  );
};

export default ViewerToolbar;