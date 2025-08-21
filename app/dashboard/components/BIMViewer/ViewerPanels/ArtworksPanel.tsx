// ArtworksPanel.tsx (Modificado con aislamiento mejorado)
"use client";

import React, { useState, useEffect } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as THREE from 'three';
import { 
  X, Search, Building, Palette, 
  ChevronRight, ChevronDown, Eye, Trash,
  AlertCircle, Check, RotateCw, Calendar,
  Focus, Home
} from 'lucide-react';
import artCollectionService, { ArtCollectionItemFormData } from '../services/artCollectionService';
import collectionGeometryHandler from '../utils/CollectionGeometryHandlers';
import { 
  zoomToElement, 
  resetView
} from '../utils/ElementZoomUtils';
import '../styles/artworkspanel.css';

interface ArtworksWithSpaces {
  spaceGuid: string;
  spaceName: string;
  spaceLongName?: string;
  artworks: ArtCollectionItemFormData[];
}

interface ArtworksPanelProps {
  onClose: () => void;
  onSpaceSelected?: (spaceGuid: string, spaceName: string, spaceLongName?: string) => void;
  onArtworkInfoRequest?: (artwork: ArtCollectionItemFormData) => void;
  models?: FRAGS.FragmentsModel[];
  fragments?: FRAGS.FragmentsManager;
  world?: any;
}

/**
 * Definición de materiales para la visualización (igual que en CollectionsPanel)
 */
const NON_HIGHLIGHTED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0.5, 0.5, 0.5),
  opacity: 0.05,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: true
};

const HIGHLIGHTED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0.2, 0.6, 1.0),
  opacity: 0.1,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: true
};

const ArtworksPanel: React.FC<ArtworksPanelProps> = ({
  onClose,
  onSpaceSelected,
  onArtworkInfoRequest,
  models,
  fragments,
  world
}) => {
  // Estados existentes
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [artworksBySpace, setArtworksBySpace] = useState<ArtworksWithSpaces[]>([]);
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [selectedArtwork, setSelectedArtwork] = useState<ArtCollectionItemFormData | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    itemId: string | null;
    name: string;
  }>({ isOpen: false, itemId: null, name: '' });
  const [updateRestoration, setUpdateRestoration] = useState<{
    isOpen: boolean;
    item: ArtCollectionItemFormData | null;
  }>({ isOpen: false, item: null });
  const [statusOptions] = useState(['Pendiente', 'En proceso', 'Completada', 'Cancelada']);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [modelIsLoaded, setModelIsLoaded] = useState<boolean>(false);

  // NUEVOS Estados para el aislamiento
  const [isolationActive, setIsolationActive] = useState<boolean>(false);
  const [selectedSpaceGuid, setSelectedSpaceGuid] = useState<string | null>(null);

  // ... (mantener todos los useEffect y funciones existentes hasta navigateToSpace)

  // Comprobar si el modelo contiene elementos de colección de arte
  useEffect(() => {
    const hasLoadedModels = Array.isArray(models) && models.length > 0;
    
    if (hasLoadedModels) {
      console.log("Modelo detectado, verificando si contiene elementos de colección de arte");
      checkModelForArtworks();
    } else {
      console.log("No hay modelos cargados, esperando...");
      setModelIsLoaded(false);
      setArtworksBySpace([]);
    }
  }, [models]);

  // Función para verificar si el modelo actual contiene elementos de colección de arte
  const checkModelForArtworks = async () => {
    setIsLoading(true);
    try {
      if (!artCollectionService) {
        console.log("Servicio de colección no disponible");
        setModelIsLoaded(false);
        return;
      }
      
      const response = await artCollectionService.getAllItems();
      console.log("Respuesta completa de getAllItems:", response);
      
      if (response.status === 'success' && response.data && response.data.items) {
        const allItems = response.data.items;
        console.log("Total de elementos encontrados:", allItems.length);
        
        if (allItems && allItems.length > 0) {
          console.log(`Se encontraron ${allItems.length} elementos de colección de arte`);
          setModelIsLoaded(true);
          processArtworksData(allItems);
          return;
        }
        
        console.log("No se encontraron elementos de colección para este modelo específico");
        setModelIsLoaded(false);
        setArtworksBySpace([]);
      } else {
        console.log("No se pudieron obtener elementos de colección");
        setModelIsLoaded(false);
        setArtworksBySpace([]);
      }
    } catch (error) {
      console.error("Error al verificar elementos de colección en el modelo:", error);
      setModelIsLoaded(false);
      showNotification("No se pudo verificar si el modelo contiene obras de arte", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para procesar y organizar los datos de las obras de arte
  const processArtworksData = (items: ArtCollectionItemFormData[]) => {
    const spaceMap = new Map<string, {
      spaceName: string;
      spaceLongName?: string;
      artworks: ArtCollectionItemFormData[];
    }>();
    
    items.forEach((item: ArtCollectionItemFormData) => {
      if (!spaceMap.has(item.spaceGuid)) {
        spaceMap.set(item.spaceGuid, {
          spaceName: item.spaceName || 'Espacio sin nombre',
          spaceLongName: item.spaceLongName,
          artworks: []
        });
      }
      
      spaceMap.get(item.spaceGuid)?.artworks.push(item);
    });
    
    const artworksArray = Array.from(spaceMap.entries()).map(([spaceGuid, data]) => ({
      spaceGuid,
      spaceName: data.spaceName,
      spaceLongName: data.spaceLongName,
      artworks: data.artworks
    }));
    
    artworksArray.sort((a, b) => a.spaceName.localeCompare(b.spaceName));
    
    setArtworksBySpace(artworksArray);
    console.log(`Datos organizados: ${artworksArray.length} espacios con obras de arte`);
  };

  // NUEVA: Función para activar el modo de aislamiento visual (copiada de CollectionsPanel)
  const activateIsolationMode = async () => {
    if (!fragments || !models || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Paso 1: Hacer casi invisibles todos los elementos (no espacios)
      for (const model of models) {
        try {
          const categories = await model.getCategories();
          
          for (const category of categories) {
            if (category === 'IFCSPACE') continue;
            
            const items = await model.getItemsOfCategory(category);
            const localIds = (await Promise.all(
              items.map(item => item.getLocalId())
            )).filter(id => id !== null) as number[];
            
            if (localIds.length > 0) {
              await model.highlight(localIds, {
                color: new THREE.Color(0.5, 0.5, 0.5),
                opacity: 0.02,
                renderedFaces: FRAGS.RenderedFaces.TWO,
                transparent: true
              });
            }
          }
        } catch (error) {
          // Silenciar error y continuar
        }
      }
      
      // Paso 2: Aplicar material específico para los espacios
      for (const model of models) {
        try {
          const items = await model.getItemsOfCategory('IFCSPACE');
          const localIds = (await Promise.all(
            items.map(item => item.getLocalId())
          )).filter(id => id !== null) as number[];
          
          if (localIds.length > 0) {
            await model.highlight(localIds, NON_HIGHLIGHTED_MATERIAL);
          }
        } catch (error) {
          // Silenciar error y continuar
        }
      }
      
      await fragments.update(true);
      
      if (collectionGeometryHandler.isInitialized()) {
        if (selectedSpaceGuid) {
          collectionGeometryHandler.showOnlySpaceGeometries(selectedSpaceGuid);
        } else {
          collectionGeometryHandler.showAllGeometries();
        }
      }
      
      setIsolationActive(true);
    } catch (error) {
      console.error('Error en activateIsolationMode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // NUEVA: Función para restaurar la vista normal (copiada de CollectionsPanel)
  const deactivateIsolationMode = async () => {
    if (!fragments || !models || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      for (const model of models) {
        await resetView(model, world, fragments, true);
      }
      
      if (collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.showAllGeometries();
      }
      
      setIsolationActive(false);
      setSelectedSpaceGuid(null);
      
      await fragments.update(true);
    } catch (error) {
      console.error('Error en deactivateIsolationMode:', error);
    } finally { 
      setIsLoading(false);
    }
  };

  // NUEVA: Función para encontrar el espacio por GUID y obtener su información
  const findSpaceByGuid = async (spaceGuid: string): Promise<{model: FRAGS.FragmentsModel, localId: number} | null> => {
    if (!models || models.length === 0) return null;
    
    for (const model of models) {
      try {
        const spaceItems = await model.getItemsOfCategory('IFCSPACE');
        
        for (const item of spaceItems) {
          const itemGuid = await item.getGuid();
          if (itemGuid === spaceGuid) {
            const localId = await item.getLocalId();
            if (localId !== null) {
              return { model, localId };
            }
          }
        }
      } catch (error) {
        console.warn(`Error buscando espacio en modelo ${model.id}:`, error);
      }
    }
    
    return null;
  };

  // MODIFICADA: Función navigateToSpace con aislamiento completo
  const navigateToSpace = async (spaceGuid: string, spaceName: string, spaceLongName?: string) => {
    if (!fragments || !world || !models || models.length === 0) return;
    
    setIsLoading(true);
    setSelectedSpaceGuid(spaceGuid);
    
    try {
      // Activar modo aislamiento si no está activo
      if (!isolationActive) {
        await activateIsolationMode();
      } else {
        // Si ya está en modo aislamiento, resetear todos los espacios a material semi-transparente
        for (const model of models) {
          try {
            const items = await model.getItemsOfCategory('IFCSPACE');
            const localIds = (await Promise.all(
              items.map(item => item.getLocalId())
            )).filter(id => id !== null) as number[];
            
            if (localIds.length > 0) {
              await model.highlight(localIds, NON_HIGHLIGHTED_MATERIAL);
            }
          } catch (error) {
            // Silenciar error
          }
        }
      }

      // Encontrar el espacio específico por GUID
      const spaceInfo = await findSpaceByGuid(spaceGuid);
      
      if (spaceInfo) {
        const { model, localId } = spaceInfo;
        
        // Hacer invisible el espacio seleccionado
        await model.setVisible([localId], false);
        
        // Hacer zoom al espacio y mostrar solo la bounding box
        await zoomToElement(
          model,
          localId,
          world,
          fragments,
          {
            zoomFactor: 2.0,
            showBoundingBox: true,
            boundingBoxDuration: 300000,
            boundingBoxColor: 0xffd700,
            highlightElement: false,
            onlyShowBoundingBox: true
          }
        );
      }
      
      // Mostrar geometrías asociadas al espacio
      if (collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.showOnlySpaceGeometries(spaceGuid);
      }
      
      await fragments.update(true);
      
      if (onSpaceSelected) {
        onSpaceSelected(spaceGuid, spaceName, spaceLongName);
      }
      
      const displayName = spaceLongName || spaceName;
      showNotification(`Navegando a espacio: ${displayName}`, 'info');
      
    } catch (error) {
      console.error('Error al navegar al espacio:', error);
      showNotification('Error al navegar al espacio', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ... (mantener todas las demás funciones existentes: toggleSpaceExpansion, viewArtworkInfo, etc.)

  const toggleSpaceExpansion = (spaceGuid: string) => {
    setExpandedSpaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spaceGuid)) {
        newSet.delete(spaceGuid);
      } else {
        newSet.add(spaceGuid);
      }
      return newSet;
    });
  };

  const viewArtworkInfo = (artwork: ArtCollectionItemFormData) => {
    setSelectedArtwork(artwork);
    
    if (onArtworkInfoRequest) {
      onArtworkInfoRequest(artwork);
    }
  };

  const openDeleteConfirmation = (itemId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({
      isOpen: true,
      itemId,
      name
    });
  };

  const deleteArtwork = async () => {
    if (!confirmDelete.itemId) return;
    
    setIsLoading(true);
    try {
      const response = await artCollectionService.deleteItem(confirmDelete.itemId);
      
      if (collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.removeCollectionGeometry(confirmDelete.itemId);
      }
      
      setArtworksBySpace(prev => {
        const updatedSpaces = prev.map(spaceData => ({
          ...spaceData,
          artworks: spaceData.artworks.filter(art => art.itemId !== confirmDelete.itemId)
        })).filter(spaceData => spaceData.artworks.length > 0);
        
        if (updatedSpaces.length === 0) {
          setModelIsLoaded(false);
        }
        
        return updatedSpaces;
      });
      
      showNotification(`Obra "${confirmDelete.name}" eliminada correctamente`, 'success');
    } catch (error) {
      console.error('Error al eliminar la obra:', error);
      showNotification('Error al eliminar la obra. Inténtelo de nuevo más tarde.', 'error');
    } finally {
      setIsLoading(false);
      setConfirmDelete({ isOpen: false, itemId: null, name: '' });
    }
  };

  const openUpdateStatus = (artwork: ArtCollectionItemFormData, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdateRestoration({
      isOpen: true,
      item: artwork
    });
    setSelectedStatus(artwork.restaurationSchedule.status || 'Pendiente');
  };

  const updateRestorationStatus = async () => {
    if (!updateRestoration.item || !selectedStatus) return;
    
    setIsLoading(true);
    try {
      const itemId = updateRestoration.item.itemId;
      const updatedItem = {
        ...updateRestoration.item,
        restaurationSchedule: {
          ...updateRestoration.item.restaurationSchedule,
          status: selectedStatus
        }
      };
      
      const response = await artCollectionService.updateItem(itemId, {
        restaurationSchedule: updatedItem.restaurationSchedule
      });
      
      setArtworksBySpace(prev => 
        prev.map(spaceData => ({
          ...spaceData,
          artworks: spaceData.artworks.map(art => 
            art.itemId === itemId 
              ? { ...art, restaurationSchedule: updatedItem.restaurationSchedule }
              : art
          )
        }))
      );
      
      showNotification(`Estado de restauración actualizado a "${selectedStatus}"`, 'success');
    } catch (error) {
      console.error('Error al actualizar el estado:', error);
      showNotification('Error al actualizar el estado. Inténtelo de nuevo más tarde.', 'error');
    } finally {
      setIsLoading(false);
      setUpdateRestoration({ isOpen: false, item: null });
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({
      message,
      type,
      visible: true
    });
    
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const getFilteredArtworks = () => {
    if (!searchTerm.trim()) return artworksBySpace;
    
    const term = searchTerm.toLowerCase();
    
    return artworksBySpace
      .map(spaceData => {
        const filteredArtworks = spaceData.artworks.filter(artwork => 
          artwork.name.toLowerCase().includes(term) ||
          artwork.description?.toLowerCase().includes(term) ||
          artwork.author?.toLowerCase().includes(term) ||
          artwork.type.toLowerCase().includes(term) ||
          artwork.tags?.some(tag => tag.toLowerCase().includes(term))
        );
        
        return {
          ...spaceData,
          artworks: filteredArtworks
        };
      })
      .filter(spaceData => 
        spaceData.spaceName.toLowerCase().includes(term) || 
        (spaceData.spaceLongName && spaceData.spaceLongName.toLowerCase().includes(term)) ||
        spaceData.artworks.length > 0
      );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completada':
        return 'status-completed';
      case 'En proceso':
        return 'status-in-progress';
      case 'Cancelada':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  const getArtworkTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      'Pintura': 'artwork-type-painting',
      'Escultura': 'artwork-type-sculpture',
      'Libro': 'artwork-type-book',
      'Manuscrito': 'artwork-type-manuscript',
      'Fotografía': 'artwork-type-photo',
      'Textil': 'artwork-type-textile',
      'Cerámica': 'artwork-type-ceramic',
      'Joyería': 'artwork-type-jewelry'
    };
    
    return typeColors[type] || 'artwork-type-other';
  };

  const filteredArtworks = getFilteredArtworks();

  if (!modelIsLoaded) {
    return (
      <div className="artworks-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Palette size={18} />
            <h3>Gestión de Obras de Arte</h3>
          </div>
          <button 
            className="panel-close-button"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X size={18} />
          </button>
        </div>
        <div className="panel-content">
          <div className="model-loading-message">
            <AlertCircle size={24} />
            <p>No se encontraron obras de arte en este modelo</p>
            <p className="loading-instruction">El modelo actual no contiene elementos de colección de arte. Cargue un modelo que contenga estos elementos para visualizarlos.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="artworks-panel">
      {/* Cabecera del panel */}
      <div className="panel-header">
        <div className="panel-title">
          <Palette size={18} />
          <h3>Gestión de Obras de Arte</h3>
        </div>
        <button 
          className="panel-close-button"
          onClick={onClose}
          aria-label="Cerrar panel"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="panel-content">
        {/* NUEVOS: Controles de aislamiento */}
        <div className="isolation-controls">
          <button 
            className={`isolation-button ${isolationActive ? 'active' : ''}`}
            onClick={isolationActive ? deactivateIsolationMode : activateIsolationMode}
            disabled={isLoading || artworksBySpace.length === 0}
          >
            {isolationActive ? (
              <>
                <X size={14} />
                <span>Restaurar Vista</span>
              </>
            ) : (
              <>
                <Focus size={14} />
                <span>Modo Aislamiento</span>
              </>
            )}
          </button>
          
          <button 
            className="reset-view-button"
            onClick={() => {
              if (world && world.camera && world.camera.controls) {
                world.camera.controls.reset();
              }
            }}
            title="Vista completa"
          >
            <Home size={14} />
          </button>
        </div>

        {/* Estado actual */}
        <div className="panel-status">
          <span className="status-info">
            {selectedSpaceGuid ? (
              <>
                Espacio seleccionado: {artworksBySpace.find(s => s.spaceGuid === selectedSpaceGuid)?.spaceLongName || 
                                     artworksBySpace.find(s => s.spaceGuid === selectedSpaceGuid)?.spaceName}
              </>
            ) : isolationActive ? (
              "Modo aislamiento activo"
            ) : (
              `Total de espacios con obras: ${artworksBySpace.length}`
            )}
          </span>
        </div>

        {/* Buscador */}
        <div className="search-container">
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar espacios u obras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="search-clear"
                onClick={() => setSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        
        {/* Notificación */}
        {notification.visible && (
          <div className={`notification ${notification.type}`}>
            {notification.type === 'success' && <Check size={16} />}
            {notification.type === 'error' && <AlertCircle size={16} />}
            {notification.type === 'info' && <AlertCircle size={16} />}
            <span>{notification.message}</span>
          </div>
        )}
        
        {/* Indicador de carga */}
        {isLoading && (
          <div className="loading-indicator">
            <RotateCw size={20} className="spin" />
            <span>Cargando...</span>
          </div>
        )}
        
        {/* Lista de espacios con obras */}
        <div className="artworks-container">
          {filteredArtworks.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? (
                <p>No se encontraron resultados para "{searchTerm}"</p>
              ) : (
                <p>No hay obras de arte registradas en el modelo actual</p>
              )}
            </div>
          ) : (
            filteredArtworks.map(spaceData => (
              <div key={spaceData.spaceGuid} className={`space-group ${selectedSpaceGuid === spaceData.spaceGuid ? 'selected' : ''}`}>
                {/* Cabecera del espacio */}
                <div 
                  className="space-header"
                  onClick={() => toggleSpaceExpansion(spaceData.spaceGuid)}
                >
                  <div className="expand-icon">
                    {expandedSpaces.has(spaceData.spaceGuid) 
                      ? <ChevronDown size={16} /> 
                      : <ChevronRight size={16} />
                    }
                  </div>
                  <div className="space-info">
                    <Building size={16} />
                    <span className="space-name">
                      {spaceData.spaceLongName && spaceData.spaceLongName !== spaceData.spaceName ? (
                        <>
                          <span className="longname-primary">{spaceData.spaceLongName}</span>
                          <span className="shortname-secondary"> ({spaceData.spaceName})</span>
                        </>
                      ) : (
                        spaceData.spaceName
                      )}
                    </span>
                    <span className="space-count">{spaceData.artworks.length}</span>
                  </div>
                  <button 
                    className="space-navigate-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToSpace(spaceData.spaceGuid, spaceData.spaceName, spaceData.spaceLongName);
                    }}
                    title="Navegar al espacio"
                  >
                    <Eye size={14} />
                  </button>
                </div>
                
                {/* Lista de obras en el espacio */}
                {expandedSpaces.has(spaceData.spaceGuid) && (
                  <div className="artworks-list">
                    {spaceData.artworks.map(artwork => (
                      <div 
                        key={artwork.itemId} 
                        className="artwork-item"
                        onClick={() => viewArtworkInfo(artwork)}
                      >
                        <div className="artwork-info">
                          <div className="artwork-main-info">
                            <span className={`artwork-type ${getArtworkTypeColor(artwork.type)}`}>
                              {artwork.type}
                            </span>
                            <span className="artwork-name">{artwork.name}</span>
                          </div>
                          <div className="artwork-secondary-info">
                            {artwork.author && (
                              <span className="artwork-author">
                                por {artwork.author}
                              </span>
                            )}
                            <span className={`artwork-status ${getStatusColor(artwork.restaurationSchedule.status)}`}>
                              {artwork.restaurationSchedule.status || 'Pendiente'}
                            </span>
                          </div>
                        </div>
                        <div className="artwork-actions">
                          <button 
                            className="artwork-action info-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewArtworkInfo(artwork);
                            }}
                            title="Ver información"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            className="artwork-action status-button"
                            onClick={(e) => openUpdateStatus(artwork, e)}
                            title="Actualizar estado"
                          >
                            <Calendar size={14} />
                          </button>
                          <button 
                            className="artwork-action delete-button"
                            onClick={(e) => openDeleteConfirmation(artwork.itemId, artwork.name, e)}
                            title="Eliminar"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Modal de confirmación de eliminación */}
      {confirmDelete.isOpen && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-header">
              <AlertCircle size={20} className="warning-icon" />
              <h4>Confirmar eliminación</h4>
            </div>
            <div className="modal-content">
              <p>¿Está seguro de que desea eliminar la obra <strong>"{confirmDelete.name}"</strong>?</p>
              <p>Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setConfirmDelete({ isOpen: false, itemId: null, name: '' })}
              >
                Cancelar
              </button>
              <button 
                className="delete-button"
                onClick={deleteArtwork}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para actualizar estado de restauración */}
      {updateRestoration.isOpen && updateRestoration.item && (
        <div className="modal-overlay">
          <div className="status-modal">
            <div className="modal-header">
              <Calendar size={20} />
              <h4>Actualizar Estado de Restauración</h4>
            </div>
            <div className="modal-content">
              <p>Obra: <strong>{updateRestoration.item.name}</strong></p>
              <p>Estado actual: <span className={`status-badge ${getStatusColor(updateRestoration.item.restaurationSchedule.status)}`}>
                {updateRestoration.item.restaurationSchedule.status || 'Pendiente'}
              </span></p>
              
              <div className="status-selection">
                <label>Seleccione el nuevo estado:</label>
                <select 
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="status-select"
                >
                  {statusOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setUpdateRestoration({ isOpen: false, item: null })}
              >
                Cancelar
              </button>
              <button 
                className="update-button"
                onClick={updateRestorationStatus}
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtworksPanel;