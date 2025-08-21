// ArtworkDetailPanel.tsx
"use client";

import React, { useState } from 'react';
import { 
    X, Check, Calendar, Clock, Paintbrush, User,
    Edit, Save, FileText, Tag, Image, Info, Trash2, // Añadir Trash2
    AlertCircle
  } from 'lucide-react';
import { ArtCollectionItemFormData } from '../services/artCollectionService';
import '../styles/artworkdetailpanel.css';

interface ArtworkDetailPanelProps {
    artwork: ArtCollectionItemFormData;
    onClose: () => void;
    onUpdateStatus?: (artwork: ArtCollectionItemFormData, newStatus: string) => Promise<void>;
    onDelete?: (artwork: ArtCollectionItemFormData) => Promise<void>; // Añadir esta prop
  }

const ArtworkDetailPanel: React.FC<ArtworkDetailPanelProps> = ({
  artwork,
  onClose,
  onUpdateStatus,
  onDelete
}) => {
  // Estados
  const [activeTab, setActiveTab] = useState<'basic' | 'technical' | 'restoration' | 'images'>('basic');
  const [isEditing, setIsEditing] = useState(false);
  const [editingStatus, setEditingStatus] = useState(artwork.restaurationSchedule.status || 'Pendiente');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
    visible: boolean;
  }>({ message: '', type: 'success', visible: false });

  // Opciones
  const statusOptions = ['Pendiente', 'En proceso', 'Completada', 'Cancelada'];

  // Formato de fecha
  const formatDate = (date: Date | null | string) => {
    if (!date) return 'No establecida';
    try {
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString();
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Obtener color según estado de restauración
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

  // Actualizar el estado de restauración
  const handleUpdateStatus = async () => {
    if (!onUpdateStatus) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(artwork, editingStatus);
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

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(artwork);
      setNotification({
        message: 'Obra eliminada correctamente',
        type: 'success',
        visible: true
      });
      // Cerrar el panel después de un breve retraso
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setNotification({
        message: 'Error al eliminar la obra',
        type: 'error',
        visible: true
      });
      setDeleteConfirmOpen(false);
      setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="artwork-detail-panel">
      {/* Cabecera del panel con título y botones de acción */}
      <div className="artwork-detail-panel-header">
        <div className="panel-title">
          <Paintbrush size={18} />
          <h3>Detalles de la Obra</h3>
        </div>
        <div className="panel-actions">
          {/* Añadir el botón de eliminar antes del botón de cerrar */}
          {onDelete && (
            <button 
              className="panel-delete-button"
              onClick={() => setDeleteConfirmOpen(true)}
              aria-label="Eliminar obra"
              title="Eliminar obra"
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

      {/* Título y tipo de la obra */}
      <div className="artwork-header">
        <div className="artwork-title">
          <h2>{artwork.name}</h2>
          <div className={`artwork-type-badge ${artwork.type.toLowerCase().replace(' ', '-')}`}>
            {artwork.type}
          </div>
        </div>
        {artwork.author && (
          <div className="artwork-author">
            <User size={14} />
            <span>{artwork.author}</span>
          </div>
        )}
      </div>

      {/* Estado de restauración */}
      <div className="restoration-status-section">
        <div className="section-title">
          <Calendar size={16} />
          <span>Estado de Restauración</span>
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
                  setEditingStatus(artwork.restaurationSchedule.status || 'Pendiente');
                }}
                disabled={isUpdating}
              >
                <X size={14} />
              </button>
              <button 
                className="save-button"
                onClick={handleUpdateStatus}
                disabled={isUpdating || editingStatus === artwork.restaurationSchedule.status}
              >
                {isUpdating ? <Clock size={14} className="spin" /> : <Save size={14} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="status-display">
            <div className={`status-badge ${getStatusColor(artwork.restaurationSchedule.status || 'Pendiente')}`}>
              {artwork.restaurationSchedule.status || 'Pendiente'}
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
        
        <div className="restoration-dates">
          <div className="date-item">
            <span className="date-label">Inicio:</span>
            <span className="date-value">{formatDate(artwork.restaurationSchedule.startDate)}</span>
          </div>
          <div className="date-item">
            <span className="date-label">Fin:</span>
            <span className="date-value">{formatDate(artwork.restaurationSchedule.endDate)}</span>
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
          <span>Básica</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'technical' ? 'active' : ''}`}
          onClick={() => setActiveTab('technical')}
        >
          <FileText size={14} />
          <span>Técnica</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'restoration' ? 'active' : ''}`}
          onClick={() => setActiveTab('restoration')}
        >
          <Paintbrush size={14} />
          <span>Restauración</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          <Image size={14} />
          <span>Imágenes</span>
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
                {artwork.description || 'No hay descripción disponible para esta obra.'}
              </p>
            </div>

            <div className="info-section">
              <h4>Ubicación</h4>
              <div className="location-info">
                <div className="info-row">
                  <span className="info-label">Espacio:</span>
                  <span className="info-value">{artwork.spaceName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Posición:</span>
                  <span className="info-value">
                    X: {artwork.position.x.toFixed(2)}, 
                    Y: {artwork.position.y.toFixed(2)}, 
                    Z: {artwork.position.z.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {artwork.period && (
              <div className="info-section">
                <h4>Período</h4>
                <p>{artwork.period}</p>
              </div>
            )}

            {artwork.tags && artwork.tags.length > 0 && (
              <div className="info-section">
                <h4>Etiquetas</h4>
                <div className="tags-list">
                  {artwork.tags.map((tag, index) => (
                    <div key={index} className="tag-item">
                      <Tag size={12} />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Información técnica */}
        {activeTab === 'technical' && (
          <div className="technical-info">
            <div className="info-section">
              <h4>Técnica y materiales</h4>
              {artwork.technique && (
                <div className="info-row">
                  <span className="info-label">Técnica:</span>
                  <span className="info-value">{artwork.technique}</span>
                </div>
              )}
              
              {artwork.materials && artwork.materials.length > 0 && (
                <div className="info-row">
                  <span className="info-label">Materiales:</span>
                  <div className="materials-list">
                    {artwork.materials.map((material, index) => (
                      <span key={index} className="material-item">{material}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {artwork.dimensions && (
              <div className="info-section">
                <h4>Dimensiones</h4>
                <div className="dimensions-grid">
                  {artwork.dimensions.height && (
                    <div className="dimension-item">
                      <span className="dimension-label">Alto:</span>
                      <span className="dimension-value">{artwork.dimensions.height} {artwork.dimensions.unit}</span>
                    </div>
                  )}
                  {artwork.dimensions.width && (
                    <div className="dimension-item">
                      <span className="dimension-label">Ancho:</span>
                      <span className="dimension-value">{artwork.dimensions.width} {artwork.dimensions.unit}</span>
                    </div>
                  )}
                  {artwork.dimensions.depth && (
                    <div className="dimension-item">
                      <span className="dimension-label">Profundidad:</span>
                      <span className="dimension-value">{artwork.dimensions.depth} {artwork.dimensions.unit}</span>
                    </div>
                  )}
                  {artwork.dimensions.weight && (
                    <div className="dimension-item">
                      <span className="dimension-label">Peso:</span>
                      <span className="dimension-value">
                        {artwork.dimensions.weight} {artwork.dimensions.unit === 'cm' ? 'kg' : artwork.dimensions.unit}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Información de restauración */}
        {activeTab === 'restoration' && (
          <div className="restoration-info">
            <div className="info-section">
              <h4>Estado de conservación inicial</h4>
              {artwork.conservationState && artwork.conservationState.initialState && (
                <>
                  <div className="info-row">
                    <span className="info-label">Puntuación:</span>
                    <span className="info-value rating">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span 
                          key={i} 
                          className={`rating-dot ${i < artwork.conservationState.initialState.rating ? 'filled' : ''}`}
                        />
                      ))}
                      <span className="rating-number">{artwork.conservationState.initialState.rating}/10</span>
                    </span>
                  </div>
                  {artwork.conservationState.initialState.date && (
                    <div className="info-row">
                      <span className="info-label">Fecha de evaluación:</span>
                      <span className="info-value">{formatDate(artwork.conservationState.initialState.date)}</span>
                    </div>
                  )}
                  {artwork.conservationState.initialState.description && (
                    <div className="info-row">
                      <span className="info-label">Descripción:</span>
                      <p className="description">{artwork.conservationState.initialState.description}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {artwork.assignedRestorers && artwork.assignedRestorers.length > 0 && (
              <div className="info-section">
                <h4>Restauradores asignados</h4>
                <div className="restorers-list">
                  {artwork.assignedRestorers.map((restorer, index) => (
                    <div key={index} className="restorer-item">
                      <div className="restorer-name">
                        <User size={14} />
                        <span>{restorer.name}</span>
                        {restorer.role && <span className="restorer-role">{restorer.role}</span>}
                      </div>
                      {restorer.email && (
                        <span className="restorer-email">{restorer.email}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {artwork.notes && (
              <div className="info-section">
                <h4>Notas adicionales</h4>
                <p className="description">{artwork.notes}</p>
              </div>
            )}
          </div>
        )}

{deleteConfirmOpen && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-header">
              <AlertCircle size={20} className="warning-icon" />
              <h4>Confirmar eliminación</h4>
            </div>
            <div className="modal-content">
              <p>¿Está seguro de que desea eliminar la obra <strong>"{artwork.name}"</strong>?</p>
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

        {/* Imágenes */}
        {activeTab === 'images' && (
          <div className="images-info">
            {artwork.images && artwork.images.length > 0 ? (
              <div className="images-grid">
                {artwork.images.map((image, index) => (
                  <div key={index} className="image-item">
                    <div className="image-container">
                      <img 
                        src={image.url} 
                        alt={image.description || `Imagen ${index + 1}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Error+cargando+imagen';
                        }}
                      />
                      <div className="image-type">{image.type}</div>
                    </div>
                    {image.description && (
                      <div className="image-description">{image.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-images">
                <Image size={48} strokeWidth={1} />
                <p>No hay imágenes disponibles para esta obra</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtworkDetailPanel;