// types/SpaceScheduleTypes.ts

/**
 * Definición de tipos para el módulo de programación de espacios
 */

/**
 * Datos del formulario de programación de espacios
 */
export interface SpaceScheduleFormData {
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
      pattern: string; // 'Diaria', 'Semanal', 'Mensual', 'Personalizada'
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
  
  /**
   * Propiedades para el componente SpaceSchedule
   */
  export interface SpaceScheduleProps {
    onSubmit: (data: SpaceScheduleFormData) => Promise<any>;
    onCancel: () => void;
    initialData?: Partial<SpaceScheduleFormData>;
    spaceData: {
      guid: string;
      id: number;
      name: string;
      modelId: string;
      position?: {
        x: number;
        y: number;
        z: number;
      };
    };
    isEditMode?: boolean;
  }
  
  /**
   * Constantes para los selectores
   */
  export const activityTypeOptions = [
    'Formación', 'Mantenimiento', 'Exposición', 'Taller', 'Conferencia', 
    'Investigación', 'Restauración', 'Visita Guiada', 'Digitalización', 
    'Catalogación', 'Documentación', 'Almacenamiento', 'Reunión', 
    'Evento Cultural', 'Consulta de Investigadores'
  ];
  
  export const statusOptions = ['Programada', 'En proceso', 'Completada', 'Cancelada', 'Pospuesta'];
  export const priorityOptions = ['Baja', 'Media', 'Alta', 'Urgente'];
  export const approvalStatusOptions = ['Pendiente', 'Aprobada', 'Rechazada', 'En revisión'];
  export const resourceTypeOptions = ['Equipamiento', 'Material', 'Mobiliario', 'Tecnología', 'Personal'];
  export const documentTypeOptions = ['Autorización', 'Memoria', 'Informe', 'Plano', 'Fotografía', 'Presupuesto', 'Otros'];
  export const weekDayOptions = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  export const recurrencePatternOptions = ['Diaria', 'Semanal', 'Mensual', 'Personalizada'];
  export const departmentOptions = [
    'Dirección', 'Conservación', 'Restauración', 'Investigación', 
    'Documentación', 'Comunicación', 'Administración', 'Seguridad', 
    'Servicios Generales', 'Difusión Cultural', 'Biblioteca y Archivo'
  ];
  
  /**
   * Función para generar un ID único para las programaciones
   */
  export const generateUniqueId = (): string => {
    return `SCH-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
  };
  
  /**
   * Interfaz para los resultados de la verificación de conflictos
   */
  export interface ConflictCheckResult {
    hasConflicts: boolean;
    conflictsCount: number;
    conflicts?: SpaceScheduleFormData[];
  }
  
  /**
   * Tipo para las pestañas del formulario
   */
  export type SpaceScheduleTab = 'basic' | 'participants' | 'resources' | 'requirements' | 'documents' | 'advanced';
  
  /**
   * Interfaz para el estado de envío del formulario
   */
  export interface SubmitStatus {
    message: string;
    type: 'success' | 'error' | 'none';
  }
  
  /**
   * Interfaz para los errores de validación del formulario
   */
  export type ValidationErrors = Record<string, string>;
  
  /**
   * Tipo para las propiedades del componente SpaceScheduleWrapper
   */
  export interface SpaceScheduleWrapperProps {
    spaceData: {
      guid: string;
      id: number;
      name: string;
      modelId: string;
      position?: {
        x: number;
        y: number;
        z: number;
      };
    };
    initialData?: Partial<SpaceScheduleFormData>;
    isEditMode?: boolean;
    onClose: () => void;
    onSuccess?: (data: SpaceScheduleFormData) => void;
  }
  
  /**
   * Tipo para la respuesta de la API
   */
  export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    error?: any;
  }
  