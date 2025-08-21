// SpaceSchedule.tsx - Primera Parte
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock, Users, FileText, MapPin, AlertTriangle, Tag, User, Info } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';
import { API_COLLECTION } from '@/server';
import spaceScheduleService from '../services/spaceScheduleService';

const API_URL = API_COLLECTION || 'http://localhost:4000';

// Crear una instancia de Axios con configuración
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 segundos
  maxContentLength: 5242880, // 5MB
  maxBodyLength: 5242880 // 5MB
});

// Añadir interceptores para mejor manejo de errores
apiClient.interceptors.request.use(config => {
  console.log(`Enviando petición a ${config.url}`, config.data);
  return config;
}, error => {
  console.error("Error en la petición:", error);
  return Promise.reject(error);
});

apiClient.interceptors.response.use(response => {
  console.log(`Respuesta de ${response.config.url}:`, response.data);
  return response;
}, error => {
  console.error("Error en la respuesta:", error);
  if (error.response) {
    // El servidor respondió con un código de estado fuera del rango 2xx
    console.error("Datos de error:", error.response.data);
    console.error("Estado:", error.response.status);
  } else if (error.request) {
    // La petición fue hecha pero no se recibió respuesta
    console.error("No se recibió respuesta:", error.request);
  } else {
    // Algo sucedió al configurar la petición que desencadenó un error
    console.error("Error de configuración:", error.message);
  }
  return Promise.reject(error);
});

// Tipos
interface SpaceScheduleFormData {
  scheduleId: string;
  title: string;
  description: string;
  activityType: string;
  startDate: Date | null;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  responsible: {
    name: string;
    email: string;
    department: string;
    phone: string;
  };
  participants: {
    name: string;
    email: string;
    role: string;
  }[];
  resources: {
    name: string;
    quantity: number;
    type: string;
  }[];
  status: string;
  priority: string;
  requiresSpecialAccess: boolean;
  specialAccessDetails: string;
  requiresConservationReview: boolean;
  conservationNotes: string;
  spaceGuid: string;
  spaceId: number;
  spaceName: string;
  modelId: string;
  recurrence: {
    isRecurring: boolean;
    pattern: string; // 'daily', 'weekly', 'monthly', 'custom'
    interval: number;
    weekDays: string[];
    endAfterOccurrences: number | null;
    endByDate: Date | null;
  };
  approvalStatus: string;
  approvedBy: string;
  approvalDate: Date | null;
  documents: {
    name: string;
    url: string;
    type: string;
  }[];
  tags: string[];
  notes: string;
  relatedActivities: string[]; // IDs de actividades relacionadas
  impactAssessment: {
    environmentalImpact: string;
    heritageImpact: string;
    visitorImpact: string;
    mitigationMeasures: string;
  };
  securityRequirements: string;
  accessibilityRequirements: string;
  estimatedAttendance: number;
}

interface SpaceScheduleProps {
  onSubmit: (data: SpaceScheduleFormData) => Promise<any>;
  onCancel: () => void;
  initialData?: Partial<SpaceScheduleFormData>;
  spaceData: {
    guid: string;
    id: number;
    name: string;
    longName?: string; // Añadido campo longName
    modelId: string;
    position?: {
      x: number;
      y: number;
      z: number;
    };
  };
  isEditMode?: boolean;
}

// Opciones para los selectores
const activityTypeOptions = [
  'Formación', 'Mantenimiento', 'Exposición', 'Taller', 'Conferencia', 
  'Investigación', 'Restauración', 'Visita Guiada', 'Digitalización', 
  'Catalogación', 'Documentación', 'Almacenamiento', 'Reunión', 
  'Evento Cultural', 'Consulta de Investigadores'
];

const statusOptions = ['Programada', 'En proceso', 'Completada', 'Cancelada', 'Pospuesta'];
const priorityOptions = ['Baja', 'Media', 'Alta', 'Urgente'];
const approvalStatusOptions = ['Pendiente', 'Aprobada', 'Rechazada', 'En revisión'];
const resourceTypeOptions = ['Equipamiento', 'Material', 'Mobiliario', 'Tecnología', 'Personal'];
const documentTypeOptions = ['Autorización', 'Memoria', 'Informe', 'Plano', 'Fotografía', 'Presupuesto', 'Otros'];
const weekDayOptions = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const recurrencePatternOptions = ['Diaria', 'Semanal', 'Mensual', 'Personalizada'];
const departmentOptions = [
  'Dirección', 'Conservación', 'Restauración', 'Investigación', 
  'Documentación', 'Comunicación', 'Administración', 'Seguridad', 
  'Servicios Generales', 'Difusión Cultural', 'Biblioteca y Archivo'
];


// Función para generar un ID único
const generateUniqueId = () => {
  return `SCH-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
};

const SpaceSchedule: React.FC<SpaceScheduleProps> = ({
  onSubmit,
  onCancel,
  initialData = {},
  spaceData,
  isEditMode = false
}) => {
  // Estado para los datos del formulario
  const [formData, setFormData] = useState<SpaceScheduleFormData>({
    scheduleId: initialData.scheduleId || generateUniqueId(),
    title: initialData.title || '',
    description: initialData.description || '',
    activityType: initialData.activityType || activityTypeOptions[0],
    startDate: initialData.startDate || new Date(),
    endDate: initialData.endDate || new Date(),
    startTime: initialData.startTime || '09:00',
    endTime: initialData.endTime || '18:00',
    allDay: initialData.allDay || false,
    responsible: {
      name: initialData.responsible?.name || '',
      email: initialData.responsible?.email || '',
      department: initialData.responsible?.department || departmentOptions[0],
      phone: initialData.responsible?.phone || ''
    },
    participants: initialData.participants || [],
    resources: initialData.resources || [],
    status: initialData.status || statusOptions[0],
    priority: initialData.priority || priorityOptions[1],
    requiresSpecialAccess: initialData.requiresSpecialAccess || false,
    specialAccessDetails: initialData.specialAccessDetails || '',
    requiresConservationReview: initialData.requiresConservationReview || false,
    conservationNotes: initialData.conservationNotes || '',
    spaceGuid: spaceData.guid,
    spaceId: spaceData.id,
    spaceName: spaceData.name,
    modelId: spaceData.modelId,
    recurrence: {
      isRecurring: initialData.recurrence?.isRecurring || false,
      pattern: initialData.recurrence?.pattern || 'Diaria',
      interval: initialData.recurrence?.interval || 1,
      weekDays: initialData.recurrence?.weekDays || ['Lunes'],
      endAfterOccurrences: initialData.recurrence?.endAfterOccurrences || null,
      endByDate: initialData.recurrence?.endByDate || null
    },
    approvalStatus: initialData.approvalStatus || approvalStatusOptions[0],
    approvedBy: initialData.approvedBy || '',
    approvalDate: initialData.approvalDate || null,
    documents: initialData.documents || [],
    tags: initialData.tags || [],
    notes: initialData.notes || '',
    relatedActivities: initialData.relatedActivities || [],
    impactAssessment: {
      environmentalImpact: initialData.impactAssessment?.environmentalImpact || '',
      heritageImpact: initialData.impactAssessment?.heritageImpact || '',
      visitorImpact: initialData.impactAssessment?.visitorImpact || '',
      mitigationMeasures: initialData.impactAssessment?.mitigationMeasures || ''
    },
    securityRequirements: initialData.securityRequirements || '',
    accessibilityRequirements: initialData.accessibilityRequirements || '',
    estimatedAttendance: initialData.estimatedAttendance || 0
  });

  // Estado para gestionar errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Estado para el participante temporal que se está añadiendo
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    role: ''
  });
  
  // Estado para el recurso temporal que se está añadiendo
  const [newResource, setNewResource] = useState({
    name: '',
    quantity: 1,
    type: resourceTypeOptions[0]
  });
  
  // Estado para el documento temporal que se está añadiendo
  const [newDocument, setNewDocument] = useState({
    name: '',
    url: '',
    type: documentTypeOptions[0]
  });
  
  // Estado para la nueva etiqueta
  const [newTag, setNewTag] = useState('');
  
  // Estado para la nueva actividad relacionada
  const [newRelatedActivity, setNewRelatedActivity] = useState('');
  
  // Estado para los tabs
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'participants', 'resources', 'requirements', 'documents', 'advanced'
  
  // Estado para mostrar mensajes de éxito/error
  const [submitStatus, setSubmitStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'none';
  }>({
    message: '',
    type: 'none'
  });
  
  // Efecto para validar fechas cuando cambian
  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      setErrors(prev => ({
        ...prev,
        endDate: 'La fecha de fin debe ser posterior a la fecha de inicio'
      }));
    } else {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.endDate;
        return newErrors;
      });
    }
  }, [formData.startDate, formData.endDate]);
  
  // Función para manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const fieldValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;
    
    // Manejar campos anidados
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof SpaceScheduleFormData],
          [child]: fieldValue
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: fieldValue
      });
    }
    
    // Limpiar error si existe
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // Función para manejar cambios en los campos numéricos
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value);
    
    // Manejar campos anidados
    if (name.includes('.')) {
      const parts = name.split('.');
      if (parts.length === 2) {
        const [parent, child] = parts;
        setFormData({
          ...formData,
          [parent]: {
            ...formData[parent as keyof SpaceScheduleFormData],
            [child]: numValue
          }
        });
      } else if (parts.length === 3) {
        const [parent, middle, child] = parts;
        setFormData({
          ...formData,
          [parent]: {
            ...formData[parent as keyof SpaceScheduleFormData],
            [middle]: {
              ...(formData[parent as keyof SpaceScheduleFormData] as any)[middle],
              [child]: numValue
            }
          }
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: numValue
      });
    }
  };
  
  // Función para manejar cambios en las fechas
  const handleDateChange = (date: Date | null, fieldName: string) => {
    if (fieldName.includes('.')) {
      const parts = fieldName.split('.');
      if (parts.length === 2) {
        const [parent, child] = parts;
        setFormData({
          ...formData,
          [parent]: {
            ...formData[parent as keyof SpaceScheduleFormData],
            [child]: date
          }
        });
      } else if (parts.length === 3) {
        const [parent, middle, child] = parts;
        setFormData({
          ...formData,
          [parent]: {
            ...formData[parent as keyof SpaceScheduleFormData],
            [middle]: {
              ...(formData[parent as keyof SpaceScheduleFormData] as any)[middle],
              [child]: date
            }
          }
        });
      }
    } else {
      setFormData({
        ...formData,
        [fieldName]: date
      });
    }
  };
  
  // Función para manejar cambios en los días de la semana (recurrencia)
  const handleWeekDayChange = (day: string) => {
    const currentWeekDays = [...formData.recurrence.weekDays];
    
    if (currentWeekDays.includes(day)) {
      // Eliminar el día si ya está seleccionado
      const updatedWeekDays = currentWeekDays.filter(d => d !== day);
      setFormData({
        ...formData,
        recurrence: {
          ...formData.recurrence,
          weekDays: updatedWeekDays
        }
      });
    } else {
      // Añadir el día si no está seleccionado
      setFormData({
        ...formData,
        recurrence: {
          ...formData.recurrence,
          weekDays: [...currentWeekDays, day]
        }
      });
    }
  };
  
  // Función para añadir un participante
  const handleAddParticipant = () => {
    if (!newParticipant.name.trim() || !newParticipant.email.trim()) return;
    
    setFormData({
      ...formData,
      participants: [...formData.participants, { ...newParticipant }]
    });
    
    setNewParticipant({
      name: '',
      email: '',
      role: ''
    });
  };
  
  // Función para eliminar un participante
  const handleRemoveParticipant = (index: number) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter((_, i) => i !== index)
    });
  };
  
  // Función para añadir un recurso
  const handleAddResource = () => {
    if (!newResource.name.trim()) return;
    
    setFormData({
      ...formData,
      resources: [...formData.resources, { ...newResource }]
    });
    
    setNewResource({
      name: '',
      quantity: 1,
      type: resourceTypeOptions[0]
    });
  };
  
  // Función para eliminar un recurso
  const handleRemoveResource = (index: number) => {
    setFormData({
      ...formData,
      resources: formData.resources.filter((_, i) => i !== index)
    });
  };
  
  // Función para añadir un documento
  const handleAddDocument = () => {
    if (!newDocument.name.trim() || !newDocument.url.trim()) return;
    
    setFormData({
      ...formData,
      documents: [...formData.documents, { ...newDocument }]
    });
    
    setNewDocument({
      name: '',
      url: '',
      type: documentTypeOptions[0]
    });
  };
  
  // Función para eliminar un documento
  const handleRemoveDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index)
    });
  };
  
  // Función para añadir una etiqueta
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    setFormData({
      ...formData,
      tags: [...formData.tags, newTag.trim()]
    });
    
    setNewTag('');
  };
  
  // Función para eliminar una etiqueta
  const handleRemoveTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };
  
  // Función para añadir una actividad relacionada
  const handleAddRelatedActivity = () => {
    if (!newRelatedActivity.trim()) return;
    
    setFormData({
      ...formData,
      relatedActivities: [...formData.relatedActivities, newRelatedActivity.trim()]
    });
    
    setNewRelatedActivity('');
  };
  
  // Función para eliminar una actividad relacionada
  const handleRemoveRelatedActivity = (index: number) => {
    setFormData({
      ...formData,
      relatedActivities: formData.relatedActivities.filter((_, i) => i !== index)
    });
  };
  
  // Función para validar el formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validar campos requeridos
    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    }
    
    if (!formData.activityType) {
      newErrors.activityType = 'El tipo de actividad es obligatorio';
    }
    
    if (!formData.responsible.name.trim()) {
      newErrors['responsible.name'] = 'El nombre del responsable es obligatorio';
    }
    
    if (!formData.responsible.email.trim()) {
      newErrors['responsible.email'] = 'El email del responsable es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.responsible.email)) {
      newErrors['responsible.email'] = 'El email no es válido';
    }
    
    // Validar fechas
    if (!formData.startDate) {
      newErrors.startDate = 'La fecha de inicio es obligatoria';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'La fecha de fin es obligatoria';
    } else if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }
    
    // Validar horas
    if (!formData.allDay) {
      if (!formData.startTime) {
        newErrors.startTime = 'La hora de inicio es obligatoria';
      }
      
      if (!formData.endTime) {
        newErrors.endTime = 'La hora de fin es obligatoria';
      } else if (
        formData.startDate?.toDateString() === formData.endDate?.toDateString() &&
        formData.startTime > formData.endTime
      ) {
        newErrors.endTime = 'La hora de fin debe ser posterior a la hora de inicio';
      }
    }
    
    // Validar recurrencia
    if (formData.recurrence.isRecurring) {
      if (formData.recurrence.pattern === 'Semanal' && formData.recurrence.weekDays.length === 0) {
        newErrors['recurrence.weekDays'] = 'Debe seleccionar al menos un día de la semana';
      }
      
      if (!formData.recurrence.endAfterOccurrences && !formData.recurrence.endByDate) {
        newErrors['recurrence.endAfterOccurrences'] = 'Debe especificar cuándo termina la recurrencia';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  

// Función para manejar el envío del formulario
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    setSubmitStatus({
      message: 'Por favor, corrija los errores en el formulario',
      type: 'error'
    });
    return;
  }
  
  try {
    setSubmitStatus({
      message: isEditMode ? 'Actualizando reserva...' : 'Guardando reserva...',
      type: 'none'
    });
    
    // Preparar datos para envío
    const preparedData = { ...formData };
    
    // Convertir fechas a ISO string
    if (preparedData.startDate instanceof Date) {
      preparedData.startDate = preparedData.startDate.toISOString();
    }
    
    if (preparedData.endDate instanceof Date) {
      preparedData.endDate = preparedData.endDate.toISOString();
    }
    
    if (preparedData.approvalDate instanceof Date) {
      preparedData.approvalDate = preparedData.approvalDate.toISOString();
    }
    
    // Convertir fecha de recurrencia si existe
    if (preparedData.recurrence?.endByDate instanceof Date) {
      preparedData.recurrence.endByDate = preparedData.recurrence.endByDate.toISOString();
    }
    
    console.log("Datos preparados para enviar:", preparedData);
    
    let response;
    
    // IMPORTANTE: Usar directamente Axios o Fetch para la petición POST
    try {
      console.log("Enviando datos directamente usando fetch");
      
      // Usar fetch para hacer la petición directamente
      const fetchResponse = await fetch(`${API_URL}/api/space-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preparedData)
      });
      
      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        throw new Error(`Error ${fetchResponse.status}: ${errorData.message || 'Error en el servidor'}`);
      }
      
      const responseData = await fetchResponse.json();
      console.log("Respuesta del servidor:", responseData);
      
      response = { status: fetchResponse.status, data: responseData };
    } catch (directError) {
      console.error("Error en la petición directa:", directError);
      
      // Si falla fetch, intentar con onSubmit si está disponible
      if (onSubmit) {
        console.log("Intentando con onSubmit proporcionado por props");
        response = await onSubmit(preparedData);
      } else {
        throw directError;
      }
    }
    
    console.log("Respuesta final:", response);
    
    // Determinar el nombre a mostrar, con preferencia por longName
    // Obtener el nombre del espacio, con preferencia por longName
    const spaceName = spaceData.longName || spaceData.name;
    
    // Mostrar mensaje de éxito personalizado con el longName del espacio
    setSubmitStatus({
      message: `Reserva de Espacio "${spaceName}" con éxito`,
      type: 'success'
    });
    
    // Esperar 5 segundos antes de cerrar
    setTimeout(() => {
      setSubmitStatus({ message: '', type: 'none' });
      onCancel(); // Cerrar el formulario después de mostrar el mensaje
    }, 5000);
  } catch (error) {
    console.error('Error completo al guardar:', error);
    
    // Determinar el nombre a mostrar para el mensaje de error
    const spaceName = spaceData.longName || spaceData.name;
    
    // Mensaje de error personalizado
    setSubmitStatus({
      message: `Espacio "${spaceName}" no disponible para esa fecha`,
      type: 'error'
    });
    
    // Mostrar el mensaje de error por 5 segundos
    setTimeout(() => {
      setSubmitStatus({ message: '', type: 'none' });
    }, 5000);
  }
};
  
// Comprobar si hay conflictos de reserva
const checkScheduleConflicts = async () => {
  if (!formData.spaceGuid || !formData.startDate || !formData.endDate) return;
  
  try {
    console.log("Verificando conflictos...");
    
    const response = await fetch(`${API_URL}/api/space-schedule/check-conflicts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        spaceGuid: formData.spaceGuid,
        startDate: formData.startDate instanceof Date ? formData.startDate.toISOString() : formData.startDate,
        endDate: formData.endDate instanceof Date ? formData.endDate.toISOString() : formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        allDay: formData.allDay,
        excludeId: isEditMode ? formData.scheduleId : undefined
      })
    });
    
    const data = await response.json();
    console.log("Resultado de verificación:", data);
    
    // Determinar el nombre a mostrar, con preferencia por longName
    const spaceName = spaceData.longName || spaceData.name;
    
    if (data && data.status === 'success') {
      if (data.data.hasConflicts) {
        setSubmitStatus({
          message: `Espacio "${spaceName}" no disponible para esa fecha`,
          type: 'error'
        });
      } else {
        setSubmitStatus({
          message: `Espacio "${spaceName}" disponible para reserva`,
          type: 'success'
        });
      }
      
      // Mostrar el mensaje por 5 segundos exactos
      setTimeout(() => {
        setSubmitStatus({ message: '', type: 'none' });
      }, 5000);
    }
  } catch (error) {
    console.error('Error al verificar conflictos:', error);
    setSubmitStatus({
      message: 'Error al verificar disponibilidad',
      type: 'error'
    });
    
    setTimeout(() => {
      setSubmitStatus({ message: '', type: 'none' });
    }, 5000);
  }
};
  
  // Efecto para verificar conflictos cuando cambian las fechas
  useEffect(() => {
    // Solo verificar conflictos si tenemos fechas válidas
    if (formData.startDate && formData.endDate && !errors.endDate) {
      const timeoutId = setTimeout(() => {
        checkScheduleConflicts();
      }, 1000); // Esperar 1 segundo después del último cambio
      
      return () => clearTimeout(timeoutId);
    }
  }, [
    formData.startDate, 
    formData.endDate, 
    formData.startTime,
    formData.endTime,
    formData.allDay
  ]);

  // Método para manejar la eliminación
  const handleDelete = async () => {
    if (!formData.scheduleId) return;
    
    try {
      setSubmitStatus({
        message: 'Eliminando reserva...',
        type: 'none'
      });
      
      // Eliminar usando el servicio
      const result = await spaceScheduleService.deleteSchedule(formData.scheduleId);
      
      if (result.status === 'success') {
        setSubmitStatus({
          message: 'Reserva eliminada con éxito',
          type: 'success'
        });
        
        // Mostrar mensaje por 5 segundos antes de cerrar
        setTimeout(() => {
          onCancel();
        }, 5000);
      } else {
        throw new Error(result.message || 'Error al eliminar');
      }
    } catch (error) {
      setSubmitStatus({
        message: `Error al eliminar: ${error.message || 'Error desconocido'}`,
        type: 'error'
      });
      
      // Mostrar el mensaje de error por 5 segundos
      setTimeout(() => {
        setSubmitStatus({ message: '', type: 'none' });
      }, 5000);
    }
  };
// Renderizar el componente

  return (
    <div className="space-schedule-container p-4 bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl font-semibold text-gray-800">
          {isEditMode ? 'Editar reserva de espacio' : 'Nueva reserva de espacio'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Estado de envío con un diseño mejorado y más visible */}
{submitStatus.type !== 'none' && (
  <div 
    className={`mb-4 p-4 rounded-lg shadow-md flex items-center ${
      submitStatus.type === 'success' 
        ? 'bg-green-100 text-green-800 border border-green-300' 
        : submitStatus.type === 'error'
          ? 'bg-red-100 text-red-800 border border-red-300'
          : 'bg-blue-100 text-blue-800 border border-blue-300'
    }`}
  >
    {submitStatus.type === 'success' && (
      <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
      </svg>
    )}
    {submitStatus.type === 'error' && (
      <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    )}
    <span className="font-medium">{submitStatus.message}</span>
  </div>
)}
      
      {/* Tabs de navegación */}
      <div className="flex border-b mb-4 overflow-x-auto">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'basic' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('basic')}
        >
          Información Básica
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'participants' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('participants')}
        >
          Participantes
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'resources' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('resources')}
        >
          Recursos
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'requirements' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('requirements')}
        >
          Requisitos
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'documents' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('documents')}
        >
          Documentos
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'advanced' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setActiveTab('advanced')}
        >
          Avanzado
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Contenido del Tab - Información Básica */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* ID de Reserva (solo lectura) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID de Reserva
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={formData.scheduleId}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700"
                />
                <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">
                  {formData.approvalStatus}
                </span>
              </div>
            </div>
            
            {/* Información del espacio */}
            <div className="bg-blue-50 p-3 rounded-md mb-4 text-gray-700">
              <div className="flex items-center">
                <MapPin className="text-blue-500 mr-2" size={20} />
                <div>
                  <span className="text-gray-500">Espacio: </span>
                  <span>{spaceData.name}</span>
                  {spaceData.longName && spaceData.longName !== spaceData.name && (
                    <span className="ml-2 text-gray-600">({spaceData.longName})</span>
                  )}
                  <span className="text-gray-500 ml-2">GUID: {spaceData.guid}</span>
                </div>
              </div>
            </div>
            
            {/* Título y Tipo de actividad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`px-3 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900`}
                  placeholder="Título de la actividad"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-500">{errors.title}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Actividad <span className="text-red-500">*</span>
                </label>
                <select
                  name="activityType"
                  value={formData.activityType}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${
                    errors.activityType ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900`}
                >
                  {activityTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.activityType && (
                  <p className="mt-1 text-xs text-red-500">{errors.activityType}</p>
                )}
              </div>
            </div>
            
            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Descripción detallada de la actividad"
              />
            </div>
            
            {/* Fecha y Hora */}
            <div className="border border-gray-200 rounded-md p-4 text-gray-700 bg-gray-50 mb-4">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Calendar className="mr-2 text-gray-500" size={20} />
                Fecha y Hora
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Inicio <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={formData.startDate}
                    onChange={(date) => handleDateChange(date, 'startDate')}
                    className={`w-full px-3 py-2 border ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900`}
                    dateFormat="dd/MM/yyyy"
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Fin <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={formData.endDate}
                    onChange={(date) => handleDateChange(date, 'endDate')}
                    className={`w-full px-3 py-2 border ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900`}
                    dateFormat="dd/MM/yyyy"
                    minDate={formData.startDate || new Date()}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>
                  )}
                </div>
              </div>
              
              {/* Todo el día / Hora */}
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    name="allDay"
                    checked={formData.allDay}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Todo el día
                  </label>
                </div>
                
                {!formData.allDay && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de Inicio <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${
                          errors.startTime ? 'border-red-500' : 'border-gray-300'
                        } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900`}
                      />
                      {errors.startTime && (
                        <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de Fin <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${
                          errors.endTime ? 'border-red-500' : 'border-gray-300'
                        } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900`}
                      />
                      {errors.endTime && (
                        <p className="mt-1 text-xs text-red-500">{errors.endTime}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Recurrencia */}
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    name="recurrence.isRecurring"
                    checked={formData.recurrence.isRecurring}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        recurrence: {
                          ...formData.recurrence,
                          isRecurring: e.target.checked
                        }
                      });
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Actividad recurrente
                  </label>
                </div>
                
                {formData.recurrence.isRecurring && (
                  <div className="border-l-2 border-blue-200 pl-4 ml-1 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Patrón de recurrencia */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Patrón
                        </label>
                        <select
                          name="recurrence.pattern"
                          value={formData.recurrence.pattern}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              recurrence: {
                                ...formData.recurrence,
                                pattern: e.target.value
                              }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {recurrencePatternOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Intervalo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Intervalo
                        </label>
                        <div className="flex items-center">
                          <span className="mr-2">Cada</span>
                          <input
                            type="number"
                            min="1"
                            name="recurrence.interval"
                            value={formData.recurrence.interval}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                recurrence: {
                                  ...formData.recurrence,
                                  interval: parseInt(e.target.value) || 1
                                }
                              });
                            }}
                            className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="ml-2">
                            {formData.recurrence.pattern === 'Diaria' ? 'días' : 
                             formData.recurrence.pattern === 'Semanal' ? 'semanas' :
                             formData.recurrence.pattern === 'Mensual' ? 'meses' : 'períodos'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Días de la semana (solo para patrón semanal) */}
                    {formData.recurrence.pattern === 'Semanal' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Días de la semana
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {weekDayOptions.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleWeekDayChange(day)}
                              className={`px-2 py-1 text-sm rounded-full ${
                                formData.recurrence.weekDays.includes(day)
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {day.substring(0, 3)}
                            </button>
                          ))}
                        </div>
                        {errors['recurrence.weekDays'] && (
                          <p className="mt-1 text-xs text-red-500">{errors['recurrence.weekDays']}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Fin de la recurrencia */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Terminar después de
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="1"
                            name="recurrence.endAfterOccurrences"
                            value={formData.recurrence.endAfterOccurrences || ''}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                recurrence: {
                                  ...formData.recurrence,
                                  endAfterOccurrences: parseInt(e.target.value) || null,
                                  endByDate: null
                                }
                              });
                            }}
                            className="w-16 px-2 py-1 border border-gray-300 rounded-md mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                          <span>repeticiones</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Terminar en fecha
                        </label>
                        <DatePicker
                          selected={formData.recurrence.endByDate}
                          onChange={(date) => {
                            setFormData({
                              ...formData,
                              recurrence: {
                                ...formData.recurrence,
                                endByDate: date,
                                endAfterOccurrences: null
                              }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          dateFormat="dd/MM/yyyy"
                          minDate={formData.startDate || new Date()}
                          placeholderText="Seleccionar fecha"
                        />
                      </div>
                    </div>
                    {errors['recurrence.endAfterOccurrences'] && (
                      <p className="mt-1 text-xs text-red-500">{errors['recurrence.endAfterOccurrences']}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Responsable */}
            <div className="border border-gray-200 rounded-md p-4 text-gray-700 bg-gray-50 mb-4">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <User className="mr-2 text-gray-500" size={20} />
                Responsable
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="responsible.name"
                    value={formData.responsible.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${
                      errors['responsible.name'] ? 'border-red-500' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Nombre del responsable"
                  />
                  {errors['responsible.name'] && (
                    <p className="mt-1 text-xs text-red-500">{errors['responsible.name']}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="responsible.email"
                    value={formData.responsible.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${
                      errors['responsible.email'] ? 'border-red-500' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Email del responsable"
                  />
                  {errors['responsible.email'] && (
                    <p className="mt-1 text-xs text-red-500">{errors['responsible.email']}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <select
                    name="responsible.department"
                    value={formData.responsible.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {departmentOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="responsible.phone"
                    value={formData.responsible.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Teléfono de contacto"
                  />
                </div>
              </div>
            </div>
            
            {/* Estado y Prioridad */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-700 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asistentes estimados
                </label>
                <input
                  type="number"
                  name="estimatedAttendance"
                  value={formData.estimatedAttendance}
                  onChange={handleNumberChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Número estimado"
                />
              </div>
            </div>
            
            {/* Etiquetas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag, index) => (
                  <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm text">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Añadir etiqueta"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Contenido del Tab - Participantes */}
        {activeTab === 'participants' && (
          <div className="space-y-4 text-gray-700">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Users className="mr-2 text-gray-500" size={20} />
              Gestión de Participantes
            </h3>
            
            {/* Formulario para añadir participantes */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="text-md font-medium mb-3">Añadir Participante</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del participante"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newParticipant.email}
                    onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email del participante"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <input
                    type="text"
                    value={newParticipant.role}
                    onChange={(e) => setNewParticipant({...newParticipant, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rol o función"
                  />
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!newParticipant.name || !newParticipant.email}
                >
                  Añadir Participante
                </button>
              </div>
            </div>
            
            {/* Lista de participantes */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="text-md font-medium mb-3">Listado de Participantes</h4>
              
              {formData.participants.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay participantes añadidos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rol
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.participants.map((participant, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {participant.name}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {participant.email}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {participant.role || '-'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(index)}
                              className="text-red-500 hover:text-red-700 focus:outline-none"
                            >
                              <X size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Contenido del Tab - Recursos */}
        {activeTab === 'resources' && (
          <div className="space-y-4 text-gray-700">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <FileText className="mr-2 text-gray-500" size={20} />
              Recursos Necesarios
            </h3>
            
            {/* Formulario para añadir recursos */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="text-md font-medium mb-3">Añadir Recurso</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newResource.name}
                    onChange={(e) => setNewResource({...newResource, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del recurso"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={newResource.type}
                    onChange={(e) => setNewResource({...newResource, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {resourceTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newResource.quantity}
                    onChange={(e) => setNewResource({...newResource, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cantidad"
                  />
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!newResource.name}
                >
                  Añadir Recurso
                </button>
              </div>
            </div>
            
            {/* Lista de recursos */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="text-md font-medium mb-3">Listado de Recursos</h4>
              
              {formData.resources.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay recursos añadidos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.resources.map((resource, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {resource.name}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {resource.type}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {resource.quantity}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveResource(index)}
                              className="text-red-500 hover:text-red-700 focus:outline-none"
                            >
                              <X size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Contenido del Tab - Requisitos */}
        {activeTab === 'requirements' && (
          <div className="space-y-4 text-gray-700">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-gray-500" size={20} />
              Requisitos Especiales
            </h3>
            
            {/* Acceso especial */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  name="requiresSpecialAccess"
                  checked={formData.requiresSpecialAccess}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Requiere acceso especial
                </label>
              </div>
              
              {formData.requiresSpecialAccess && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detalles de acceso especial
                  </label>
                  <textarea
                    name="specialAccessDetails"
                    value={formData.specialAccessDetails}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Especifique los detalles de acceso especial requeridos"
                  />
                </div>
              )}
            </div>
            
            {/* Revisión de conservación */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  name="requiresConservationReview"
                  checked={formData.requiresConservationReview}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Requiere revisión de conservación
                </label>
              </div>
              
              {formData.requiresConservationReview && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas de conservación
                  </label>
                  <textarea
                    name="conservationNotes"
                    value={formData.conservationNotes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Notas para el departamento de conservación"
                  />
                </div>
              )}
            </div>
            
            {/* Evaluación de impacto */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="text-md font-medium mb-3">Evaluación de Impacto</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impacto Ambiental
                  </label>
                  <textarea
                    name="impactAssessment.environmentalImpact"
                    value={formData.impactAssessment.environmentalImpact}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describa el posible impacto ambiental"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impacto en el Patrimonio
                  </label>
                  <textarea
                    name="impactAssessment.heritageImpact"
                    value={formData.impactAssessment.heritageImpact}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describa el posible impacto en el patrimonio"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impacto en Visitantes
                  </label>
                  <textarea
                    name="impactAssessment.visitorImpact"
                    value={formData.impactAssessment.visitorImpact}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describa el posible impacto en los visitantes"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medidas de Mitigación
                  </label>
                  <textarea
                    name="impactAssessment.mitigationMeasures"
                    value={formData.impactAssessment.mitigationMeasures}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describa las medidas de mitigación propuestas"
                  />
                </div>
              </div>
            </div>
            
            {/* Requisitos de seguridad y accesibilidad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requisitos de Seguridad
                </label>
                <textarea
                  name="securityRequirements"
                  value={formData.securityRequirements}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalles sobre requisitos de seguridad"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requisitos de Accesibilidad
                </label>
                <textarea
                  name="accessibilityRequirements"
                  value={formData.accessibilityRequirements}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalles sobre requisitos de accesibilidad"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Contenido del Tab - Documentos */}
        {activeTab === 'documents' && (
          <div className="space-y-4 text-gray-700">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <FileText className="mr-2 text-gray-500" size={20} />
              Documentación
            </h3>
            
            {/* Formulario para añadir documentos */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="text-md font-medium mb-3">Añadir Documento</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newDocument.name}
                    onChange={(e) => setNewDocument({...newDocument, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del documento"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={newDocument.type}
                    onChange={(e) => setNewDocument({...newDocument, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {documentTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL / Enlace
                  </label>
                  <input
                    type="text"
                    value={newDocument.url}
                    onChange={(e) => setNewDocument({...newDocument, url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="URL del documento"
                  />
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!newDocument.name || !newDocument.url}
                >
                  Añadir Documento
                </button>
              </div>
            </div>
            
            {/* Lista de documentos */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="text-md font-medium mb-3">Listado de Documentos</h4>
              
              {formData.documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay documentos añadidos</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {formData.documents.map((doc, index) => (
                    <div key={index} className="flex flex-col md:flex-row justify-between items-start md:items-center border border-gray-200 rounded-md p-3">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-blue-600 font-medium">{doc.name}</span>
                          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {doc.type}
                          </span>
                        </div>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline mt-1 block"
                        >
                          {doc.url}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(index)}
                        className="text-red-500 hover:text-red-700 mt-2 md:mt-0 focus:outline-none"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Contenido del Tab - Avanzado */}
        {activeTab === 'advanced' && (
          <div className="space-y-4 text-gray-700">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Info className="mr-2 text-gray-500" size={20} />
              Configuración Avanzada
            </h3>
            
            {/* Aprobación */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="text-md font-medium mb-3">Estado de Aprobación</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado de Aprobación
                  </label>
                  <select
                    name="approvalStatus"
                    value={formData.approvalStatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {approvalStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aprobado por
                  </label>
                  <input
                    type="text"
                    name="approvedBy"
                    value={formData.approvedBy}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del aprobador"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Aprobación
                  </label>
                  <DatePicker
                    selected={formData.approvalDate}
                    onChange={(date) => handleDateChange(date, 'approvalDate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccionar fecha"
                    isClearable
                  />
                </div>
              </div>
            </div>
            
            {/* Actividades relacionadas */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="text-md font-medium mb-3">Actividades Relacionadas</h4>
              
              <div className="flex mb-3">
                <input
                  type="text"
                  value={newRelatedActivity}
                  onChange={(e) => setNewRelatedActivity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID de actividad relacionada"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRelatedActivity();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddRelatedActivity}
                  className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Añadir
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.relatedActivities.map((activity, index) => (
                  <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                    <span>{activity}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRelatedActivity(index)}
                      className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {formData.relatedActivities.length === 0 && (
                <p className="text-gray-500 text-sm">No hay actividades relacionadas</p>
              )}
            </div>
            
            {/* Notas adicionales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas Adicionales
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas adicionales sobre esta reserva"
              />
            </div>
          </div>
        )}
        
        {/* Botones de acción */}
        <div className="flex justify-between gap-3 mt-6 pt-4 border-t">
          <div>
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 mr-2"
              >
                Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
          </div>
          
          <div>
            <button
              type="button"
              onClick={checkScheduleConflicts}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2"
            >
              Verificar Disponibilidad
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Save size={18} className="inline mr-1" />
              {isEditMode ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SpaceSchedule;