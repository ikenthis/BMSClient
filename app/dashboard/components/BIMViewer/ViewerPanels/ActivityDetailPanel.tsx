// ActivityDetailPanel.tsx
"use client";

import React, { useState } from 'react';
import { 
  X, Check, Calendar as CalendarIcon, Clock, Users,
  Edit, Save, FileText, Tag, MapPin, Info, Building,
  Trash2, AlertCircle, Mail, Phone, Briefcase, Star
} from 'lucide-react';
import { SpaceScheduleFormData } from '../types/SpaceScheduleTypes';
import "../styles/activitydetailpanel.css";

interface ActivityDetailPanelProps {
  activity: SpaceScheduleFormData;
  onClose: () => void;
  onUpdateStatus?: (activity: SpaceScheduleFormData, newStatus: string) => Promise<void>;
  onDelete?: (activity: SpaceScheduleFormData) => Promise<void>;
}

const ActivityDetailPanel: React.FC<ActivityDetailPanelProps> = ({
  activity,
  onClose,
  onUpdateStatus,
  onDelete
}) => {
  // Estados
  const [activeTab, setActiveTab] = useState<'basic' | 'participants' | 'resources' | 'requirements' | 'documents'>('basic');
  const [isEditing, setIsEditing] = useState(false);
  const [editingStatus, setEditingStatus] = useState(activity.status || 'Programada');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
    visible: boolean;
  }>({ message: '', type: 'success', visible: false });

  // Opciones
  const statusOptions = ['Programada', 'En proceso', 'Completada', 'Cancelada', 'Pospuesta'];
  const priorityColors: Record<string, string> = {
    'Baja': 'priority-low',
    'Media': 'priority-medium',
    'Alta': 'priority-high',
    'Urgente': 'priority-urgent'
  };

  // Formato de fecha
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'No establecida';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Formato de hora
  const formatTime = (time: string | undefined) => {
    if (!time) return '';
    return time;
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

  // Actualizar el estado de la actividad
  const handleUpdateStatus = async () => {
    if (!onUpdateStatus) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(activity, editingStatus);
      setNotification({
        message: 'Estado actualizado correctamente',
        type: 'success',
        visible: true
      });
      setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 3000);
      setIsEditing(false);
    } catch (error) {
      setNotification({
        message: 'Error al actualizar el estado',
        type: 'error',
        visible: true
      });
      setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  // Eliminar actividad
  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(activity);
      setNotification({
        message: 'Actividad eliminada correctamente',
        type: 'success',
        visible: true
      });
      // Cerrar el panel después de un breve retraso
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setNotification({
        message: 'Error al eliminar la actividad',
        type: 'error',
        visible: true
      });
      setDeleteConfirmOpen(false);
      setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Comprobar si una actividad está activa, pasada o futura
  const getActivityTimeStatus = () => {
    const now = new Date();
    const startDate = typeof activity.startDate === 'string' 
      ? new Date(activity.startDate) 
      : activity.startDate;
    const endDate = typeof activity.endDate === 'string' 
      ? new Date(activity.endDate) 
      : activity.endDate;
    
    // Ajustar las fechas con las horas si no es todo el día
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
    
    // Para eventos de todo el día
    if (now < startDate) return 'future';
    if (now > endDate) {
      // Si el día ha terminado (comparando solo fechas)
      const endDay = new Date(endDate);
      endDay.setHours(23, 59, 59);
      if (now > endDay) return 'past';
    }
    
    return 'active';
  };

  const getTimeStatusText = () => {
    const timeStatus = getActivityTimeStatus();
    
    switch (timeStatus) {
      case 'active':
        return 'En curso';
      case 'past':
        return 'Finalizada';
      case 'future':
        return 'Próxima';
      default:
        return '';
    }
  };

  const getTimeStatusClass = () => {
    const timeStatus = getActivityTimeStatus();
    
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

  // Usamos un div contenedor con posicionamiento fijo para controlar la capa modal
  return (
    <div className="fixed inset-0 flex items-center justify-center z-100" style={{backgroundColor: 'rgba(0, 0, 0, 0)'}}>
      <div className="activity-detail-panel">
        {/* Cabecera del panel con título y botones de acción */}
        <div className="activity-detail-panel-header">
          <div className="panel-title">
            <CalendarIcon size={18} />
            <h3>Detalles de la Actividad</h3>
          </div>
          <div className="panel-actions">
            {onDelete && (
              <button 
                className="panel-delete-button"
                onClick={() => setDeleteConfirmOpen(true)}
                aria-label="Eliminar actividad"
                title="Eliminar actividad"
              >
                <Trash2 size={18} color="#ff4d4f" />
              </button>
            )}
            <button 
              className="panel-close-button"
              onClick={onClose}
              aria-label="Cerrar panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notificación */}
        {notification.visible && (
          <div className={`notification ${notification.type}`}>
            {notification.type === 'success' ? <Check size={16} /> : <Info size={16} />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Título y tipo de la actividad */}
        <div className="activity-header">
          <div className="activity-title">
            <h2>{activity.title}</h2>
            <div className="activity-meta">
              <div className="activity-type-badge">
                {activity.activityType}
              </div>
              <div className={`activity-priority-badge ${priorityColors[activity.priority] || ''}`}>
                <Star size={12} />
                <span>{activity.priority}</span>
              </div>
            </div>
          </div>
          <div className="activity-time-status">
            <span className={`time-badge ${getTimeStatusClass()}`}>
              {getTimeStatusText()}
            </span>
          </div>
        </div>

        {/* Fecha y hora */}
        <div className="activity-time-section">
          <div className="section-title">
            <CalendarIcon size={16} />
            <span>Programación</span>
          </div>
          
          <div className="activity-datetime">
            <div className="datetime-group">
              <span className="datetime-label">Inicio:</span>
              <div className="datetime-value">
                <span className="date">{formatDate(activity.startDate)}</span>
                {!activity.allDay && activity.startTime && (
                  <span className="time">{formatTime(activity.startTime)}</span>
                )}
              </div>
            </div>
            
            <div className="datetime-group">
              <span className="datetime-label">Fin:</span>
              <div className="datetime-value">
                <span className="date">{formatDate(activity.endDate)}</span>
                {!activity.allDay && activity.endTime && (
                  <span className="time">{formatTime(activity.endTime)}</span>
                )}
              </div>
            </div>
            
            {activity.allDay && (
              <div className="all-day-indicator">
                <Clock size={14} />
                <span>Todo el día</span>
              </div>
            )}
          </div>
        </div>

        {/* Estado actual */}
        <div className="activity-status-section">
          <div className="section-title">
            <Info size={16} />
            <span>Estado</span>
          </div>
          
          {isEditing ? (
            <div className="status-editor">
              <select 
                value={editingStatus}
                onChange={(e) => setEditingStatus(e.target.value)}
                className="status-select"
                disabled={isUpdating}
              >
                {statusOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <div className="status-editor-actions">
                <button 
                  className="cancel-button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingStatus(activity.status || 'Programada');
                  }}
                  disabled={isUpdating}
                >
                  <X size={14} />
                </button>
                <button 
                  className="save-button"
                  onClick={handleUpdateStatus}
                  disabled={isUpdating || editingStatus === activity.status}
                >
                  {isUpdating ? <Clock size={14} className="spin" /> : <Save size={14} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="status-display">
              <div className={`status-badge ${getStatusColor(activity.status || 'Programada')}`}>
                {activity.status || 'Programada'}
              </div>
              {onUpdateStatus && (
                <button 
                  className="edit-button"
                  onClick={() => setIsEditing(true)}
                  title="Editar estado"
                >
                  <Edit size={14} />
                </button>
              )}
            </div>
          )}
          
          {activity.approvalStatus && (
            <div className="approval-status">
              <span className="approval-label">Estado de aprobación:</span>
              <span className={`approval-badge ${activity.approvalStatus.toLowerCase().replace(' ', '-')}`}>
                {activity.approvalStatus}
              </span>
              {activity.approvedBy && (
                <span className="approved-by">
                  por {activity.approvedBy}
                  {activity.approvalDate && ` (${formatDate(activity.approvalDate)})`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Ubicación */}
        <div className="activity-location-section">
          <div className="section-title">
            <MapPin size={16} />
            <span>Ubicación</span>
          </div>
          
          <div className="location-info">
            <div className="location-icon">
              <Building size={24} />
            </div>
            <div className="location-details">
              <div className="location-name">
                {activity.spaceLongName || activity.spaceName}
                {activity.spaceLongName && activity.spaceName !== activity.spaceLongName && (
                  <span className="location-code">({activity.spaceName})</span>
                )}
              </div>
              <div className="location-id">
                ID: {activity.spaceId} | GUID: {activity.spaceGuid}
              </div>
            </div>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="tabs-nav">
          <button 
            className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            <Info size={14} />
            <span>Información</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            <Users size={14} />
            <span>Participantes</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            <FileText size={14} />
            <span>Recursos</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'requirements' ? 'active' : ''}`}
            onClick={() => setActiveTab('requirements')}
          >
            <AlertCircle size={14} />
            <span>Requisitos</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FileText size={14} />
            <span>Documentos</span>
          </button>
        </div>

        {/* Contenido según la pestaña activa */}
        <div className="tab-content">
          {/* Información básica */}
          {activeTab === 'basic' && (
            <div className="basic-info">
              <div className="info-section">
                <h4>Descripción</h4>
                <p className="description">
                  {activity.description || 'No hay descripción disponible para esta actividad.'}
                </p>
              </div>
              
              <div className="info-section">
                <h4>Responsable</h4>
                <div className="responsible-info">
                  <div className="responsible-name">
                    <Users size={14} />
                    <span>{activity.responsible.name}</span>
                  </div>
                  
                  <div className="responsible-details">
                    {activity.responsible.email && (
                      <div className="responsible-email">
                        <Mail size={14} />
                        <span>{activity.responsible.email}</span>
                      </div>
                    )}
                    
                    {activity.responsible.phone && (
                      <div className="responsible-phone">
                        <Phone size={14} />
                        <span>{activity.responsible.phone}</span>
                      </div>
                    )}
                    
                    {activity.responsible.department && (
                      <div className="responsible-department">
                        <Briefcase size={14} />
                        <span>{activity.responsible.department}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {activity.estimatedAttendance > 0 && (
                <div className="info-section">
                  <h4>Asistentes estimados</h4>
                  <div className="attendance-info">
                    <Users size={14} />
                    <span>{activity.estimatedAttendance} personas</span>
                  </div>
                </div>
              )}

              {activity.tags && activity.tags.length > 0 && (
                <div className="info-section">
                  <h4>Etiquetas</h4>
                  <div className="tags-list">
                    {activity.tags.map((tag, index) => (
                      <div key={index} className="tag-item">
                        <Tag size={12} />
                        <span>{tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activity.notes && (
                <div className="info-section">
                  <h4>Notas adicionales</h4>
                  <p className="description">{activity.notes}</p>
                </div>
              )}
              
              {activity.relatedActivities && activity.relatedActivities.length > 0 && (
                <div className="info-section">
                  <h4>Actividades relacionadas</h4>
                  <div className="related-activities-list">
                    {activity.relatedActivities.map((relatedActivity, index) => (
                      <div key={index} className="related-activity-item">
                        <CalendarIcon size={12} />
                        <span>{relatedActivity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Participantes */}
          {activeTab === 'participants' && (
            <div className="participants-info">
              {activity.participants && activity.participants.length > 0 ? (
                <div className="participants-list">
                  {activity.participants.map((participant, index) => (
                    <div key={index} className="participant-item">
                      <div className="participant-name">
                        <Users size={14} />
                        <span>{participant.name}</span>
                        {participant.role && <span className="participant-role">{participant.role}</span>}
                      </div>
                      {participant.email && (
                        <div className="participant-email">
                          <Mail size={14} />
                          <span>{participant.email}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-participants">
                  <Users size={32} strokeWidth={1} />
                  <p>No hay participantes registrados para esta actividad</p>
                </div>
              )}
            </div>
          )}

          {/* Recursos */}
          {activeTab === 'resources' && (
            <div className="resources-info">
              {activity.resources && activity.resources.length > 0 ? (
                <div className="resources-list">
                  {activity.resources.map((resource, index) => (
                    <div key={index} className="resource-item">
                      <div className="resource-info">
                        <div className="resource-name">
                          <span className="resource-type-badge">{resource.type}</span>
                          <span>{resource.name}</span>
                        </div>
                        <div className="resource-quantity">
                          <span>Cantidad: {resource.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-resources">
                  <FileText size={32} strokeWidth={1} />
                  <p>No hay recursos registrados para esta actividad</p>
                </div>
              )}
            </div>
          )}

          {/* Requisitos */}
          {activeTab === 'requirements' && (
            <div className="requirements-info">
              {/* Acceso especial */}
              {activity.requiresSpecialAccess && (
                <div className="info-section">
                  <h4 className="requirement-header special-access">Acceso especial requerido</h4>
                  {activity.specialAccessDetails && (
                    <p className="requirement-description">{activity.specialAccessDetails}</p>
                  )}
                </div>
              )}
              
              {/* Revisión de conservación */}
              {activity.requiresConservationReview && (
                <div className="info-section">
                  <h4 className="requirement-header conservation-review">Revisión de conservación requerida</h4>
                  {activity.conservationNotes && (
                    <p className="requirement-description">{activity.conservationNotes}</p>
                  )}
                </div>
              )}
              
              {/* Evaluación de impacto */}
              {activity.impactAssessment && (
                <div className="info-section">
                  <h4>Evaluación de impacto</h4>
                  
                  {activity.impactAssessment.environmentalImpact && (
                    <div className="impact-item">
                      <h5>Impacto ambiental</h5>
                      <p>{activity.impactAssessment.environmentalImpact}</p>
                    </div>
                  )}
                  
                  {activity.impactAssessment.heritageImpact && (
                    <div className="impact-item">
                      <h5>Impacto en el patrimonio</h5>
                      <p>{activity.impactAssessment.heritageImpact}</p>
                    </div>
                  )}
                  
                  {activity.impactAssessment.visitorImpact && (
                    <div className="impact-item">
                      <h5>Impacto en visitantes</h5>
                      <p>{activity.impactAssessment.visitorImpact}</p>
                    </div>
                  )}
                  
                  {activity.impactAssessment.mitigationMeasures && (
                    <div className="impact-item">
                      <h5>Medidas de mitigación</h5>
                      <p>{activity.impactAssessment.mitigationMeasures}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Requisitos de seguridad */}
              {activity.securityRequirements && (
                <div className="info-section">
                  <h4>Requisitos de seguridad</h4>
                  <p className="requirement-description">{activity.securityRequirements}</p>
                </div>
              )}
              
              {/* Requisitos de accesibilidad */}
              {activity.accessibilityRequirements && (
                <div className="info-section">
                  <h4>Requisitos de accesibilidad</h4>
                  <p className="requirement-description">{activity.accessibilityRequirements}</p>
                </div>
              )}
              
              {/* Mensaje si no hay requisitos especiales */}
              {!activity.requiresSpecialAccess && 
               !activity.requiresConservationReview && 
               !activity.impactAssessment?.environmentalImpact && 
               !activity.impactAssessment?.heritageImpact && 
               !activity.impactAssessment?.visitorImpact && 
               !activity.impactAssessment?.mitigationMeasures && 
               !activity.securityRequirements && 
               !activity.accessibilityRequirements && (
                <div className="empty-requirements">
                  <AlertCircle size={32} strokeWidth={1} />
                  <p>No hay requisitos especiales registrados para esta actividad</p>
                </div>
              )}
            </div>
          )}

          {/* Documentos */}
          {activeTab === 'documents' && (
            <div className="documents-info">
              {activity.documents && activity.documents.length > 0 ? (
                <div className="documents-list">
                  {activity.documents.map((document, index) => (
                    <div key={index} className="document-item">
                      <div className="document-info">
                        <div className="document-name">
                          <span className="document-type-badge">{document.type}</span>
                          <span>{document.name}</span>
                        </div>
                        <a 
                          href={document.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="document-link"
                        >
                          Ver documento
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-documents">
                  <FileText size={32} strokeWidth={1} />
                  <p>No hay documentos registrados para esta actividad</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Modal de confirmación de eliminación */}
        {deleteConfirmOpen && (
          <div className="modal-overlay">
            <div className="confirmation-modal">
              <div className="modal-header">
                <AlertCircle size={20} className="warning-icon" />
                <h4>Confirmar eliminación</h4>
              </div>
              <div className="modal-content">
                <p>¿Está seguro de que desea eliminar la actividad <strong>"{activity.title}"</strong>?</p>
                <p>Esta acción no se puede deshacer.</p>
              </div>
              <div className="modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button 
                  className="delete-button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Clock size={14} className="spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Eliminar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityDetailPanel;