// ActivitiesPanel.tsx (Modificado con aislamiento mejorado)
"use client";

import React, { useState, useEffect } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as THREE from 'three';
import { 
  X, Search, Building, Calendar as CalendarIcon, 
  ChevronRight, ChevronDown, Eye, Trash,
  AlertCircle, Check, RotateCw, Clock, Users,
  Tag, Filter, Focus, Home
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import '../styles/activitiespanel.css';
import ActivityDetailPanel from './ActivityDetailPanel';
import { 
  zoomToElement, 
  resetView
} from '../utils/ElementZoomUtils';

// Importar el servicio que se usará para interactuar con las actividades
import spaceScheduleService, { ScheduleData } from '../services/spaceScheduleService';

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

// Interfaz para agrupar actividades por espacio (similar a ArtworksWithSpaces)
interface ActivitiesWithSpaces {
  spaceGuid: string;
  spaceName: string;
  spaceLongName?: string;
  activities: ScheduleData[];
}

interface ActivitiesPanelProps {
  onClose: () => void;
  onSpaceSelected?: (spaceGuid: string, spaceName: string, spaceLongName?: string) => void;
  onActivityInfoRequest?: (activity: ScheduleData) => void;
  models?: FRAGS.FragmentsModel[];
  fragments?: FRAGS.FragmentsManager;
  world?: any;
}

const ActivitiesPanel: React.FC<ActivitiesPanelProps> = ({
  onClose,
  onSpaceSelected,
  onActivityInfoRequest,
  models,
  fragments,
  world
}) => {
  // Estados existentes
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activitiesBySpace, setActivitiesBySpace] = useState<ActivitiesWithSpaces[]>([]);
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [selectedActivity, setSelectedActivity] = useState<ScheduleData | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
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
  const [updateStatus, setUpdateStatus] = useState<{
    isOpen: boolean;
    item: ScheduleData | null;
  }>({ isOpen: false, item: null });
  const [statusOptions] = useState(['Programada', 'En proceso', 'Completada', 'Cancelada', 'Pospuesta']);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [modelIsLoaded, setModelIsLoaded] = useState<boolean>(false);

  // NUEVOS Estados para el aislamiento
  const [isolationActive, setIsolationActive] = useState<boolean>(false);
  const [selectedSpaceGuid, setSelectedSpaceGuid] = useState<string | null>(null);
  
  // Estados para filtros
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: null as Date | null,
      endDate: null as Date | null
    },
    activityType: '',
    status: '',
    priority: ''
  });
  const [activityTypeOptions] = useState([
    'Todas', 'Formación', 'Mantenimiento', 'Exposición', 'Taller', 'Conferencia', 
    'Investigación', 'Restauración', 'Visita Guiada', 'Digitalización', 
    'Catalogación', 'Documentación', 'Almacenamiento', 'Reunión', 
    'Evento Cultural', 'Consulta de Investigadores'
  ]);
  const [priorityOptions] = useState(['Todas', 'Baja', 'Media', 'Alta', 'Urgente']);

  // Comprobar si el modelo contiene actividades programadas
  useEffect(() => {
    const hasLoadedModels = Array.isArray(models) && models.length > 0;
    
    if (hasLoadedModels) {
      console.log("Modelo detectado, verificando si contiene actividades programadas");
      loadActivities();
    } else {
      console.log("No hay modelos cargados, esperando...");
      setModelIsLoaded(false);
      setActivitiesBySpace([]);
      setIsLoading(false);
    }
  }, [models]);
  
  // Cargar actividades
  const loadActivities = async () => {
    setIsLoading(true);
    try {
      if (!spaceScheduleService) {
        console.log("Servicio de programación no disponible");
        setModelIsLoaded(false);
        setIsLoading(false);
        return;
      }
      
      const response = await spaceScheduleService.getAllSchedules();
      console.log("Respuesta completa de getAllSchedules:", response);
      
      if (response.status === 'success' && response.data && response.data.schedules) {
        const allSchedules = response.data.schedules;
        console.log("Total de actividades encontradas:", allSchedules.length);
        
        if (allSchedules && allSchedules.length > 0) {
          console.log(`Se encontraron ${allSchedules.length} actividades programadas`);
          setModelIsLoaded(true);
          processActivitiesData(allSchedules);
        } else {
          console.log("No se encontraron actividades programadas");
          setModelIsLoaded(false);
          setActivitiesBySpace([]);
        }
      } else {
        console.log("No se pudieron obtener actividades programadas");
        setModelIsLoaded(false);
        setActivitiesBySpace([]);
      }
    } catch (error) {
      console.error("Error al cargar actividades programadas:", error);
      setModelIsLoaded(false);
      showNotification("No se pudieron cargar las actividades programadas", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para procesar y organizar los datos de las actividades
  const processActivitiesData = (items: ScheduleData[]) => {
    const spaceMap = new Map<string, {
      spaceName: string;
      spaceLongName?: string;
      activities: ScheduleData[];
    }>();
    
    items.forEach((item: ScheduleData) => {
      if (!spaceMap.has(item.spaceGuid)) {
        spaceMap.set(item.spaceGuid, {
          spaceName: item.spaceName || 'Espacio sin nombre',
          spaceLongName: item.spaceLongName,
          activities: []
        });
      }
      
      const processedItem = {
        ...item,
        startDate: typeof item.startDate === 'string' ? new Date(item.startDate) : item.startDate,
        endDate: typeof item.endDate === 'string' ? new Date(item.endDate) : item.endDate
      };
      
      spaceMap.get(item.spaceGuid)?.activities.push(processedItem);
    });
    
    const activitiesArray = Array.from(spaceMap.entries()).map(([spaceGuid, data]) => ({
      spaceGuid,
      spaceName: data.spaceName,
      spaceLongName: data.spaceLongName,
      activities: data.activities
    }));
    
    activitiesArray.sort((a, b) => a.spaceName.localeCompare(b.spaceName));
    
    setActivitiesBySpace(activitiesArray);
    console.log(`Datos organizados: ${activitiesArray.length} espacios con actividades`);
  };

  // Debugging: imprimir las actividades para ver si tienen spaceLongName
  useEffect(() => {
    if (activitiesBySpace.length > 0) {
      console.log("Actividades agrupadas por espacios (para depurar longName):", 
        activitiesBySpace.map(space => ({
          spaceGuid: space.spaceGuid,
          spaceName: space.spaceName,
          spaceLongName: space.spaceLongName,
          activitiesCount: space.activities.length
        }))
      );
    }
  }, [activitiesBySpace]);

  // NUEVA: Función para activar el modo de aislamiento visual (corregida)
  const activateIsolationMode = async () => {
    if (!fragments || !models || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      console.log('Activando modo de aislamiento...');
      
      // Paso 1: Hacer casi invisibles todos los elementos (no espacios)
      for (const model of models) {
        try {
          console.log(`Procesando modelo ${model.id}...`);
          const categories = await model.getCategories();
          console.log(`Categorías encontradas:`, categories);
          
          for (const category of categories) {
            // Saltar los espacios en este paso
            if (category === 'IFCSPACE') continue;
            
            try {
              // Obtener elementos de esta categoría
              const items = await model.getItemsOfCategory(category);
              const localIds = (await Promise.all(
                items.map(item => item.getLocalId())
              )).filter(id => id !== null) as number[];
              
              if (localIds.length > 0) {
                console.log(`Aplicando material invisible a ${localIds.length} elementos de categoría ${category}`);
                // Aplicar material muy transparente (casi invisible)
                await model.highlight(localIds, {
                  color: new THREE.Color(0.5, 0.5, 0.5),
                  opacity: 0.02, // Extremadamente transparente
                  renderedFaces: FRAGS.RenderedFaces.TWO,
                  transparent: true
                });
              }
            } catch (error) {
              console.warn(`Error procesando categoría ${category}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Error procesando modelo ${model.id}:`, error);
        }
      }
      
      // Paso 2: Aplicar material específico para los espacios
      for (const model of models) {
        try {
          // Obtener solo los espacios
          const items = await model.getItemsOfCategory('IFCSPACE');
          const localIds = (await Promise.all(
            items.map(item => item.getLocalId())
          )).filter(id => id !== null) as number[];
          
          if (localIds.length > 0) {
            console.log(`Aplicando material translúcido a ${localIds.length} espacios`);
            // Aplicar material translúcido para espacios
            await model.highlight(localIds, NON_HIGHLIGHTED_MATERIAL);
          }
        } catch (error) {
          console.warn(`Error aplicando material a espacios en modelo ${model.id}:`, error);
        }
      }
      
      // Actualizar fragmentos
      await fragments.update(true);
      console.log('Modo de aislamiento activado correctamente');
      
      setIsolationActive(true);
    } catch (error) {
      console.error('Error en activateIsolationMode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // NUEVA: Función para restaurar la vista normal (corregida)
  const deactivateIsolationMode = async () => {
    if (!fragments || !models || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      console.log('Desactivando modo de aislamiento...');
      
      // Restablecer la vista para cada modelo
      for (const model of models) {
        try {
          await resetView(model, world, fragments, true);
          console.log(`Vista restablecida para modelo ${model.id}`);
        } catch (error) {
          console.warn(`Error restableciendo vista del modelo ${model.id}:`, error);
        }
      }
      
      // Resetear estados
      setIsolationActive(false);
      setSelectedSpaceGuid(null);
      
      // Actualizar fragmentos
      await fragments.update(true);
      console.log('Modo de aislamiento desactivado correctamente');
    } catch (error) {
      console.error('Error en deactivateIsolationMode:', error);
    } finally { 
      setIsLoading(false);
    }
  };

  // NUEVA: Función para encontrar el espacio por GUID y obtener su información (corregida)
  const findSpaceByGuid = async (spaceGuid: string): Promise<{model: FRAGS.FragmentsModel, localId: number} | null> => {
    if (!models || models.length === 0) {
      console.warn('No hay modelos disponibles para buscar el espacio');
      return null;
    }
    
    console.log(`Buscando espacio con GUID: ${spaceGuid} en ${models.length} modelos`);
    
    for (const model of models) {
      try {
        console.log(`Buscando en modelo ${model.id}...`);
        
        // Verificar si el modelo tiene espacios
        const categories = await model.getCategories();
        if (!categories.includes('IFCSPACE')) {
          console.log(`Modelo ${model.id} no contiene espacios IFCSPACE`);
          continue;
        }
        
        const spaceItems = await model.getItemsOfCategory('IFCSPACE');
        console.log(`Modelo ${model.id} tiene ${spaceItems.length} espacios`);
        
        for (const item of spaceItems) {
          try {
            const itemGuid = await item.getGuid();
            const localId = await item.getLocalId();
            
            console.log(`Revisando espacio: GUID=${itemGuid}, localId=${localId}`);
            
            if (itemGuid === spaceGuid && localId !== null) {
              console.log(`¡Espacio encontrado! Modelo: ${model.id}, LocalId: ${localId}`);
              return { model, localId };
            }
          } catch (error) {
            console.warn(`Error obteniendo información del item en modelo ${model.id}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Error buscando espacio en modelo ${model.id}:`, error);
      }
    }
    
    console.warn(`No se encontró el espacio con GUID: ${spaceGuid}`);
    return null;
  };

  // Expandir/colapsar un espacio
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

  // MODIFICADA: Función navigateToSpace con aislamiento completo (corregida)
  const navigateToSpace = async (spaceGuid: string, spaceName: string, spaceLongName?: string) => {
    if (!fragments || !world || !models || models.length === 0) return;
    
    setIsLoading(true);
    setSelectedSpaceGuid(spaceGuid);
    
    try {
      console.log(`Navegando a espacio: ${spaceName} (${spaceGuid})`);
      
      // Activar modo aislamiento si no está activo
      if (!isolationActive) {
        console.log('Activando modo de aislamiento automáticamente...');
        await activateIsolationMode();
      } else {
        console.log('Modo de aislamiento ya activo, reseteando espacios...');
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
            console.warn(`Error reseteando espacios en modelo ${model.id}:`, error);
          }
        }
      }

      // Encontrar el espacio específico por GUID
      console.log(`Buscando espacio con GUID: ${spaceGuid}`);
      const spaceInfo = await findSpaceByGuid(spaceGuid);
      
      if (spaceInfo) {
        const { model, localId } = spaceInfo;
        console.log(`Espacio encontrado: modelo ${model.id}, localId ${localId}`);
        
        // Hacer invisible el espacio seleccionado
        console.log('Ocultando el espacio seleccionado...');
        await model.setVisible([localId], false);
        
        // Hacer zoom al espacio y mostrar solo la bounding box
        console.log('Aplicando zoom al espacio...');
        await zoomToElement(
          model,
          localId,
          world,
          fragments,
          {
            zoomFactor: 2.0,
            showBoundingBox: true,
            boundingBoxDuration: 300000, // 5 minutos
            boundingBoxColor: 0xffd700, // Color dorado
            highlightElement: false,
            onlyShowBoundingBox: true
          }
        );
        
        console.log('Zoom aplicado correctamente');
      } else {
        console.warn(`No se pudo encontrar el espacio con GUID: ${spaceGuid}`);
        showNotification(`No se pudo encontrar el espacio: ${spaceName}`, 'error');
      }
      
      // Actualizar fragmentos
      await fragments.update(true);
      
      // Notificar al componente padre
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

  // Ver información de la actividad
  const viewActivityInfo = (activity: ScheduleData) => {
    setSelectedActivity(activity);
    setShowDetailPanel(true);
    
    if (onActivityInfoRequest) {
      onActivityInfoRequest(activity);
    }
  };

  // Abrir diálogo de confirmación para eliminar
  const openDeleteConfirmation = (itemId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({
      isOpen: true,
      itemId,
      name
    });
  };

  // Eliminar actividad
  const deleteActivity = async () => {
    if (!confirmDelete.itemId) return;
    
    setIsLoading(true);
    try {
      const response = await spaceScheduleService.deleteSchedule(confirmDelete.itemId);
      
      setActivitiesBySpace(prev => {
        const updatedSpaces = prev.map(spaceData => ({
          ...spaceData,
          activities: spaceData.activities.filter(act => act.scheduleId !== confirmDelete.itemId)
        })).filter(spaceData => spaceData.activities.length > 0);
        
        if (updatedSpaces.length === 0) {
          setModelIsLoaded(false);
        }
        
        return updatedSpaces;
      });
      
      showNotification(`Actividad "${confirmDelete.name}" eliminada correctamente`, 'success');
    } catch (error) {
      console.error('Error al eliminar la actividad:', error);
      showNotification('Error al eliminar la actividad. Inténtelo de nuevo más tarde.', 'error');
    } finally {
      setIsLoading(false);
      setConfirmDelete({ isOpen: false, itemId: null, name: '' });
    }
  };

  // Abrir modal para actualizar estado
  const openUpdateStatus = (activity: ScheduleData, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdateStatus({
      isOpen: true,
      item: activity
    });
    setSelectedStatus(activity.status || 'Programada');
  };

  // Actualizar estado
  const updateActivityStatus = async () => {
    if (!updateStatus.item || !selectedStatus) return;
    
    setIsLoading(true);
    try {
      const scheduleId = updateStatus.item.scheduleId;
      
      const response = await spaceScheduleService.updateSchedule(scheduleId, {
        status: selectedStatus
      });
      
      setActivitiesBySpace(prev => 
        prev.map(spaceData => ({
          ...spaceData,
          activities: spaceData.activities.map(act => 
            act.scheduleId === scheduleId 
              ? { ...act, status: selectedStatus }
              : act
          )
        }))
      );
      
      showNotification(`Estado actualizado a "${selectedStatus}"`, 'success');
    } catch (error) {
      console.error('Error al actualizar el estado:', error);
      showNotification('Error al actualizar el estado. Inténtelo de nuevo más tarde.', 'error');
    } finally {
      setIsLoading(false);
      setUpdateStatus({ isOpen: false, item: null });
    }
  };

  const handleUpdateActivityFromDetail = async (activity: ScheduleData, newStatus: string) => {
    setIsLoading(true);
    try {
      const scheduleId = activity.scheduleId;
      
      const response = await spaceScheduleService.updateSchedule(scheduleId, {
        status: newStatus
      });
      
      setActivitiesBySpace(prev => 
        prev.map(spaceData => ({
          ...spaceData,
          activities: spaceData.activities.map(act => 
            act.scheduleId === scheduleId 
              ? { ...act, status: newStatus }
              : act
          )
        }))
      );
      
      if (selectedActivity && selectedActivity.scheduleId === scheduleId) {
        setSelectedActivity({
          ...selectedActivity,
          status: newStatus
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al actualizar el estado:', error);
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar la eliminación desde el panel de detalles
  const handleDeleteActivityFromDetail = async (activity: ScheduleData) => {
    setIsLoading(true);
    try {
      const response = await spaceScheduleService.deleteSchedule(activity.scheduleId);
      
      setActivitiesBySpace(prev => {
        const updatedSpaces = prev.map(spaceData => ({
          ...spaceData,
          activities: spaceData.activities.filter(act => act.scheduleId !== activity.scheduleId)
        })).filter(spaceData => spaceData.activities.length > 0);
        
        if (updatedSpaces.length === 0) {
          setModelIsLoaded(false);
        }
        
        return updatedSpaces;
      });
      
      setShowDetailPanel(false);
      setSelectedActivity(null);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al eliminar la actividad:', error);
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar notificación
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

  // Función para formatear fecha
  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Función para formatear hora
  const formatTime = (time: string) => {
    if (!time) return '';
    return time;
  };

  // Función para calcular si una actividad está activa, pasada o futura
  const getActivityTimeStatus = (activity: ScheduleData) => {
    const now = new Date();
    const startDate = typeof activity.startDate === 'string' 
      ? new Date(activity.startDate) 
      : activity.startDate;
    const endDate = typeof activity.endDate === 'string' 
      ? new Date(activity.endDate) 
      : activity.endDate;
    
    if (!activity.allDay && activity.startTime && activity.endTime) {
      const [startHours, startMinutes] = activity.startTime.split(':').map(Number);
      const [endHours, endMinutes] = activity.endTime.split(':').map(Number);
      
      const startDateTime = new Date(startDate);
      startDateTime.setHours(startHours, startMinutes, 0);
      
      const endDateTime = new Date(endDate);
      endDateTime.setHours(endHours, endMinutes, 0);
      
      if (now < startDateTime) return 'future';
      if (now > endDateTime) return 'past';
      return 'active';
    }
    
    if (now < startDate) return 'future';
    if (now > endDate) {
      const endDay = new Date(endDate);
      endDay.setHours(23, 59, 59);
      if (now > endDay) return 'past';
    }
    
    return 'active';
  };

  // Calcular estado temporal (activa, pasada, futura)
  const getTimeStatusClass = (activity: ScheduleData) => {
    const timeStatus = getActivityTimeStatus(activity);
    
    switch (timeStatus) {
      case 'active':
        return 'time-status-active';
      case 'past':
        return 'time-status-past';
      case 'future':
        return 'time-status-future';
      default:
        return '';
    }
  };

  // Obtener color según estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completada':
        return 'status-completed';
      case 'En proceso':
        return 'status-in-progress';
      case 'Cancelada':
        return 'status-cancelled';
      case 'Pospuesta':
        return 'status-postponed';
      default:
        return 'status-scheduled';
    }
  };

  // Renderizar color según tipo de actividad
  const getActivityTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      'Formación': 'activity-type-formation',
      'Mantenimiento': 'activity-type-maintenance',
      'Exposición': 'activity-type-exhibition',
      'Taller': 'activity-type-workshop',
      'Conferencia': 'activity-type-conference',
      'Investigación': 'activity-type-research',
      'Restauración': 'activity-type-restoration',
      'Visita Guiada': 'activity-type-guided-tour',
      'Digitalización': 'activity-type-digitization',
      'Catalogación': 'activity-type-cataloging',
      'Documentación': 'activity-type-documentation',
      'Almacenamiento': 'activity-type-storage',
      'Reunión': 'activity-type-meeting',
      'Evento Cultural': 'activity-type-cultural',
      'Consulta de Investigadores': 'activity-type-research-query'
    };
    
    return typeColors[type] || 'activity-type-other';
  };

  // Resetear filtros
  const resetFilters = () => {
    setFilters({
      dateRange: {
        startDate: null,
        endDate: null
      },
      activityType: '',
      status: '',
      priority: ''
    });
  };

  // Aplicar filtros a las actividades
  const getFilteredActivities = () => {
    let filteredActivities = [...activitiesBySpace];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      
      filteredActivities = filteredActivities
        .map(spaceData => {
          const filteredItems = spaceData.activities.filter(activity => 
            activity.title.toLowerCase().includes(term) ||
            activity.description?.toLowerCase().includes(term) ||
            activity.responsible?.name.toLowerCase().includes(term) ||
            activity.activityType.toLowerCase().includes(term) ||
            activity.tags?.some(tag => tag.toLowerCase().includes(term))
          );
          
          return {
            ...spaceData,
            activities: filteredItems
          };
        })
        .filter(spaceData => 
          spaceData.spaceName.toLowerCase().includes(term) || 
          (spaceData.spaceLongName && spaceData.spaceLongName.toLowerCase().includes(term)) || 
          spaceData.activities.length > 0
        );
    }
    
    if (
      filters.dateRange.startDate || 
      filters.dateRange.endDate || 
      filters.activityType || 
      filters.status || 
      filters.priority
    ) {
      filteredActivities = filteredActivities
        .map(spaceData => {
          const filteredItems = spaceData.activities.filter(activity => {
            if (filters.dateRange.startDate || filters.dateRange.endDate) {
              const activityStartDate = typeof activity.startDate === 'string' 
                ? new Date(activity.startDate) 
                : activity.startDate;
                
              const activityEndDate = typeof activity.endDate === 'string' 
                ? new Date(activity.endDate) 
                : activity.endDate;
              
              const startOfActStartDate = new Date(activityStartDate);
              startOfActStartDate.setHours(0, 0, 0, 0);
              
              const endOfActEndDate = new Date(activityEndDate);
              endOfActEndDate.setHours(23, 59, 59, 999);
              
              if (filters.dateRange.startDate && endOfActEndDate < filters.dateRange.startDate) {
                return false;
              }
              
              if (filters.dateRange.endDate) {
                const endOfFilterDate = new Date(filters.dateRange.endDate);
                endOfFilterDate.setHours(23, 59, 59, 999);
                
                if (startOfActStartDate > endOfFilterDate) {
                  return false;
                }
              }
            }
            
            if (filters.activityType && filters.activityType !== 'Todas' && 
                activity.activityType !== filters.activityType) {
              return false;
            }
            
            if (filters.status && filters.status !== 'Todas' && 
                activity.status !== filters.status) {
              return false;
            }
            
            if (filters.priority && filters.priority !== 'Todas' && 
                activity.priority !== filters.priority) {
              return false;
            }
            
            return true;
          });
          
          return {
            ...spaceData,
            activities: filteredItems
          };
        })
        .filter(spaceData => spaceData.activities.length > 0);
    }
    
    return filteredActivities;
  };

  const filteredActivities = getFilteredActivities();

  return (
    <div className="activities-panel">
      {/* Cabecera del panel */}
      <div className="panel-header">
        <div className="panel-title">
          <CalendarIcon size={18} />
          <h3>Gestión de Actividades</h3>
        </div>
        <button 
          className="panel-close-button"
          onClick={onClose}
          aria-label="Cerrar panel"
        >
          <X size={18} />
        </button>
      </div>
      
      {!modelIsLoaded && !isLoading ? (
        <div className="panel-content">
          <div className="model-loading-message">
            <AlertCircle size={24} />
            <p>No se encontraron actividades programadas</p>
            <p className="loading-instruction">No hay actividades programadas en este momento. Use el panel de programación para crear nuevas actividades.</p>
          </div>
        </div>
      ) : (
        /* Contenido del panel cuando hay modelo con actividades */
        <div className="panel-content">
          {/* NUEVOS: Controles de aislamiento */}
          <div className="isolation-controls">
            <button 
              className={`isolation-button ${isolationActive ? 'active' : ''}`}
              onClick={isolationActive ? deactivateIsolationMode : activateIsolationMode}
              disabled={isLoading || activitiesBySpace.length === 0}
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
                  Espacio seleccionado: {activitiesBySpace.find(s => s.spaceGuid === selectedSpaceGuid)?.spaceLongName || 
                                       activitiesBySpace.find(s => s.spaceGuid === selectedSpaceGuid)?.spaceName}
                </>
              ) : isolationActive ? (
                "Modo aislamiento activo"
              ) : (
                `Total de espacios con actividades: ${activitiesBySpace.length}`
              )}
            </span>
          </div>

          {/* Buscador */}
          <div className="search-container">
            <div className="search-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar espacios o actividades..."
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
            <button 
              className={`filter-button ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              title="Mostrar filtros"
            >
              <Filter size={16} />
            </button>
          </div>
          
          {/* Filtros avanzados */}
          {showFilters && (
            <div className="filters-container">
              <h4 className="filters-title">Filtros</h4>
              
              <div className="filters-grid">
                {/* Filtro por rango de fechas */}
                <div className="filter-group">
                  <label className="filter-label">Rango de fechas</label>
                  <div className="date-range-picker">
                    <div className="date-picker-wrapper">
                      <span className="date-label">Desde:</span>
                      <DatePicker
                        selected={filters.dateRange.startDate}
                        onChange={(date) => setFilters({
                          ...filters,
                          dateRange: {
                            ...filters.dateRange,
                            startDate: date
                          }
                        })}
                        selectsStart
                        startDate={filters.dateRange.startDate}
                        endDate={filters.dateRange.endDate}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Fecha inicio"
                        className="date-picker-input"
                        isClearable
                      />
                    </div>
                    <div className="date-picker-wrapper">
                      <span className="date-label">Hasta:</span>
                      <DatePicker
                        selected={filters.dateRange.endDate}
                        onChange={(date) => setFilters({
                          ...filters,
                          dateRange: {
                            ...filters.dateRange,
                            endDate: date
                          }
                        })}
                        selectsEnd
                        startDate={filters.dateRange.startDate}
                        endDate={filters.dateRange.endDate}
                        minDate={filters.dateRange.startDate}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Fecha fin"
                        className="date-picker-input"
                        isClearable
                      />
                    </div>
                  </div>
                </div>
                
                {/* Filtro por tipo de actividad */}
                <div className="filter-group">
                  <label className="filter-label">Tipo de actividad</label>
                  <select 
                    value={filters.activityType}
                    onChange={(e) => setFilters({
                      ...filters,
                      activityType: e.target.value
                    })}
                    className="filter-select"
                  >
                    {activityTypeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro por estado */}
                <div className="filter-group">
                  <label className="filter-label">Estado</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({
                      ...filters,
                      status: e.target.value
                    })}
                    className="filter-select"
                  >
                    <option value="">Todos</option>
                    {statusOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro por prioridad */}
                <div className="filter-group">
                  <label className="filter-label">Prioridad</label>
                  <select 
                    value={filters.priority}
                    onChange={(e) => setFilters({
                      ...filters,
                      priority: e.target.value
                    })}
                    className="filter-select"
                  >
                    {priorityOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="filters-actions">
                <button 
                  className="reset-filters-button"
                  onClick={resetFilters}
                >
                  Restablecer
                </button>
              </div>
            </div>
          )}
          
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
          
          {/* Lista de espacios con actividades */}
          <div className="activities-container">
            {filteredActivities.length === 0 ? (
              <div className="empty-state">
                {searchTerm || Object.values(filters).some(val => 
                  val !== '' && val !== null && 
                  (typeof val !== 'object' || Object.values(val).some(v => v !== null))
                ) ? (
                  <p>No se encontraron resultados para los filtros aplicados</p>
                ) : (
                  <p>No hay actividades programadas</p>
                )}
              </div>
            ) : (
              filteredActivities.map(spaceData => (
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
                      <span className="space-count">{spaceData.activities.length}</span>
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
                  
                  {/* Lista de actividades en el espacio */}
                  {expandedSpaces.has(spaceData.spaceGuid) && (
                    <div className="activities-list">
                      {spaceData.activities.map(activity => (
                        <div 
                          key={activity.scheduleId} 
                          className={`activity-item ${getTimeStatusClass(activity)}`}
                          onClick={() => viewActivityInfo(activity)}
                        >
                          <div className="activity-info">
                            <div className="activity-main-info">
                              <span className={`activity-type ${getActivityTypeColor(activity.activityType)}`}>
                                {activity.activityType}
                              </span>
                              <span className="activity-name">{activity.title}</span>
                            </div>
                            <div className="activity-secondary-info">
                              <div className="activity-dates">
                                <CalendarIcon size={12} />
                                <span className="activity-date">
                                  {formatDate(activity.startDate)}
                                  {!activity.allDay && (
                                    <span className="activity-time"> {formatTime(activity.startTime)}</span>
                                  )}
                                  {activity.endDate && formatDate(activity.startDate) !== formatDate(activity.endDate) && (
                                    <>
                                      <span className="date-separator"> - </span>
                                      {formatDate(activity.endDate)}
                                      {!activity.allDay && (
                                        <span className="activity-time"> {formatTime(activity.endTime)}</span>
                                      )}
                                    </>
                                  )}
                                  {activity.allDay && <span className="all-day-badge"> (Todo el día)</span>}
                                </span>
                              </div>
                              <div className="activity-responsible">
                                <Users size={12} />
                                <span>{activity.responsible?.name || 'Sin responsable'}</span>
                              </div>
                              <span className={`activity-status ${getStatusColor(activity.status)}`}>
                                {activity.status || 'Programada'}
                              </span>
                            </div>
                          </div>
                          <div className="activity-actions">
                            <button 
                              className="activity-action info-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewActivityInfo(activity);
                              }}
                              title="Ver información"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              className="activity-action status-button"
                              onClick={(e) => openUpdateStatus(activity, e)}
                              title="Actualizar estado"
                            >
                              <Clock size={14} />
                            </button>
                            <button 
                              className="activity-action delete-button"
                              onClick={(e) => openDeleteConfirmation(activity.scheduleId, activity.title, e)}
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
      )}
      
      {/* Modal de confirmación de eliminación */}
      {confirmDelete.isOpen && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-header">
              <AlertCircle size={20} className="warning-icon" />
              <h4>Confirmar eliminación</h4>
            </div>
            <div className="modal-content">
              <p>¿Está seguro de que desea eliminar la actividad <strong>"{confirmDelete.name}"</strong>?</p>
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
                onClick={deleteActivity}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para actualizar estado */}
      {updateStatus.isOpen && updateStatus.item && (
        <div className="modal-overlay">
          <div className="status-modal">
            <div className="modal-header">
              <Clock size={20} />
              <h4>Actualizar Estado de Actividad</h4>
            </div>
            <div className="modal-content">
              <p>Actividad: <strong>{updateStatus.item.title}</strong></p>
              <p>Estado actual: <span className={`status-badge ${getStatusColor(updateStatus.item.status)}`}>
                {updateStatus.item.status || 'Programada'}
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
                onClick={() => setUpdateStatus({ isOpen: false, item: null })}
              >
                Cancelar
              </button>
              <button 
                className="update-button"
                onClick={updateActivityStatus}
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de detalles de actividad */}
      {showDetailPanel && selectedActivity && (
        <ActivityDetailPanel
          activity={selectedActivity}
          onClose={() => {
            setShowDetailPanel(false);
            setSelectedActivity(null);
          }}
          onUpdateStatus={handleUpdateActivityFromDetail}
          onDelete={handleDeleteActivityFromDetail}
        />
      )}
    </div>
  );
};

export default ActivitiesPanel;