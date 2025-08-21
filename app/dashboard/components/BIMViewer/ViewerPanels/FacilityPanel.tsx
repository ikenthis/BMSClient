// FacilityPanel.tsx con previsualización de documentos mejorada

import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertCircle, ExternalLink, Edit3, Database, FileText, Film, Eye, X, Truck, Phone } from 'lucide-react';
import axios from 'axios';
import { API_URL_INFO } from '@/server';
import dynamic from 'next/dynamic';

// Importar dynamically el visualizador de PDF para mejorar la carga inicial
const PDFViewer = dynamic(() => import('react-pdf').then(mod => {
  mod.pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.pdfjs.version}/pdf.worker.min.js`;
  return mod.Document;
}), {
  ssr: false,
  loading: () => <div className="pdf-loading">Cargando visor PDF...</div>
});

// Crear instancia de axios para usar en todas las peticiones
const api = axios.create({
  baseURL: API_URL_INFO,
  headers: {
    'Content-Type': 'application/json'
  }
});

interface FacilityPanelProps {
  elementData: {
    elementUuid?: string;
    elementName?: string;
    elementType?: string;
    category?: string;
    originalData?: any;
  };
}

interface ElementInfo {
  elementUuid: string;
  modelId: string;
  localId: number;
  elementName: string;
  elementType: string;
  category: string;
  description: string;
  location: string;
  installationDate: string;
  warrantyExpiration: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  maintenanceFrequency: string;
  maintenanceInstructions: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  specifications: Record<string, string>;
  cost: number;
  purchaseDate: string;
  supplier: string;
  supplierContact: string;
  documents: Array<{
    _id: string;
    name: string;
    type: string;
    url: string;
    uploadDate: string;
    description: string;
  }>;
  images: Array<{
    _id: string;
    name: string;
    url: string;
    uploadDate: string;
    description: string;
  }>;
  videos: Array<{
    _id: string;
    name: string;
    url: string;
    uploadDate: string;
    description: string;
  }>;
  history: Array<{
    _id: string;
    date: string;
    action: string;
    description: string;
    performedBy: string;
    cost: number;
    notes: string;
  }>;
  customAttributes: Record<string, any>;
}

const FacilityPanel: React.FC<FacilityPanelProps> = ({ elementData }) => {
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [elementUuid, setElementUuid] = useState<string | null>(null);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [needsInitialization, setNeedsInitialization] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Nuevas variables para la previsualización del documento
  const [documentTitle, setDocumentTitle] = useState<string>('Vista previa del documento');
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState<boolean>(false);
  const documentPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadElementInfo = async () => {
      console.log("Datos recibidos en FacilityPanel:", elementData);
      
      setLoading(true);
      setError(null);
      
      // Si tenemos el GUID, intentamos cargar datos con él
      if (elementData.elementUuid) {
        try {
          setElementUuid(elementData.elementUuid);
          
          // Codificar correctamente el GUID para la URL
          const encodedUuid = encodeURIComponent(elementData.elementUuid);
          console.log("Consultando API con UUID:", elementData.elementUuid);
          console.log("Endpoint:", `/api/bim-element-info/uuid/${encodedUuid}`);
          
          const response = await api.get(`/api/bim-element-info/uuid/${encodedUuid}`);
          
          if (response.data && response.data.success) {
            console.log("Datos encontrados en la BD:", response.data.data);
            
            // ¡Importante! Guardar los datos recibidos
            setElementInfo(response.data.data);
            
            // Actualizar imagen principal si disponible
            if (response.data.data.images && response.data.data.images.length > 0) {
              setMainImageUrl(response.data.data.images[0].url);
            }
            
            // Actualizar notas si hay historial
            if (response.data.data.history && response.data.data.history.length > 0) {
              const sortedHistory = [...response.data.data.history].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              setNotes(sortedHistory[0].notes || '');
            }
            
            // Ya tenemos datos, NO necesitamos inicialización
            setNeedsInitialization(false);
            setLoading(false);
            return;
          } else {
            // No encontramos datos para este UUID
            console.log("No se encontraron datos para el UUID en la BD");
            setNeedsInitialization(true);
          }
        } catch (err:any) {
          console.error("Error consultando por UUID:", err);
          // Si el error es 404, necesitamos inicialización
          if (err.response && err.response.status === 404) {
            setNeedsInitialization(true);
          } else {
            setError(`Error consultando datos: ${err.message}`);
          }
        }
      } else {
        console.log("No se recibió UUID para consultar");
        setNeedsInitialization(true);
      }
      
      setLoading(false);
    };
    
    loadElementInfo();
  }, [elementData]);

  // Efecto para cerrar la previsualización con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPdfPreview(null);
        setImagePreview(null);
        setDocumentPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Inicializar un nuevo elemento en la base de datos
  const initializeElement = async () => {
    if (!elementUuid && !elementData.elementUuid) {
      setError("No se dispone de UUID para inicializar el elemento");
      return;
    }
    
    const guidToUse = elementUuid || elementData.elementUuid;
    setLoading(true);
    
    try {
      const newElementData = {
        elementUuid: guidToUse,
        modelId: 'unknown-model',
        localId: 0,
        elementName: elementData.elementName || `Elemento ${guidToUse.substring(0, 8)}`,
        elementType: elementData.elementType || '',
        category: elementData.category || '',
        description: 'Elemento inicializado automáticamente',
        supplier: '',
        supplierContact: ''
      };
      
      console.log("Inicializando elemento con datos:", newElementData);
      
      const response = await api.post('/api/bim-element-info', newElementData);
      
      if (response.data.success) {
        console.log("Elemento inicializado correctamente:", response.data.data);
        setElementInfo(response.data.data);
        setNeedsInitialization(false);
        setSuccessMessage('Elemento inicializado correctamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(`Error en inicialización: ${response.data.message || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error("Error en inicialización:", err);
      
      if (err.response) {
        if (err.response.status === 400) {
          setError(`Error: El elemento ya existe o faltan campos requeridos`);
        } else {
          setError(`Error (${err.response.status}): ${err.response.data?.message || 'Error desconocido'}`);
        }
      } else {
        setError(`Error: ${err.message || 'No se pudo inicializar el elemento'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar la vista previa de documentos
  const handleDocumentPreview = (url: string, name: string) => {
    setDocumentTitle(name || 'Vista previa del documento');
    setPdfPreview(url);
    setDocumentPreviewOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No disponible';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Handle edit notes
  const handleSaveNotes = async () => {
    if (!elementUuid) return;
    
    setIsSaving(true);
    
    try {
      // Añadir como registro de mantenimiento con acción 'note'
      const encodedUuid = encodeURIComponent(elementUuid);
      const endpoint = `/api/bim-element-info/uuid/${encodedUuid}/maintenance`;
      
      const response = await api.post(endpoint, {
        action: 'note',
        description: 'Actualización de notas',
        performedBy: 'Usuario',
        notes,
        date: new Date().toISOString()
      });
      
      if (response.data.success) {
        // Actualizar datos
        const updatedResponse = await api.get(`/api/bim-element-info/uuid/${encodedUuid}`);
        
        if (updatedResponse.data.success) {
          setElementInfo(updatedResponse.data.data);
          setIsEditMode(false);
          
          setSuccessMessage('Notas guardadas correctamente');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    } catch (err:any) {
      console.error('Error al guardar notas:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error desconocido';
      setError(`Error: ${errorMsg}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="facility-loading">
        <p>Cargando información del elemento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="facility-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button 
          className="facility-reload-button"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (needsInitialization) {
    return (
      <div className="facility-empty">
        <p>No hay información de gestión para este elemento.</p>
        <button 
          className="facility-action-button"
          onClick={initializeElement}
          disabled={loading}
        >
          Inicializar datos de gestión
        </button>
      </div>
    );
  }

  if (!elementInfo) {
    return (
      <div className="facility-empty">
        <p>No se pudieron cargar los datos del elemento.</p>
        <button 
          className="facility-reload-button"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="property-section">
      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="success-message">
          <p>{successMessage}</p>
        </div>
      )}
      
      {/* Imagen del equipo */}
      <div className="facility-image-container">
        {mainImageUrl ? (
          <img 
            src={mainImageUrl} 
            alt={elementInfo.elementName || 'Imagen del equipo'} 
            className="facility-image"
            onClick={() => setImagePreview(mainImageUrl)}
          />
        ) : (
          <div className="facility-image-placeholder">
            <div className="facility-image-text">
              Imagen del equipo
              <span className="facility-image-subtext">{elementInfo.model || elementInfo.elementType}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Vista previa de imágenes */}
      {imagePreview && (
        <div className="image-preview-overlay" onClick={() => setImagePreview(null)}>
          <div className="image-preview-container" onClick={e => e.stopPropagation()}>
            <div className="image-preview-header">
              <button 
                className="close-preview-button"
                onClick={() => setImagePreview(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="image-preview-content">
              <img src={imagePreview} alt="Vista previa" />
            </div>
          </div>
        </div>
      )}
      
      {/* Vista previa de documentos mejorada */}
      {pdfPreview && documentPreviewOpen && (
      <div 
        className="document-preview-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => {
          setPdfPreview(null);
          setDocumentPreviewOpen(false);
        }}
      >
        <div 
          className="document-preview-container"
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div 
            className="document-preview-header"
            style={{
              padding: '16px',
              borderBottom: '1px solid #eaeaea',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h4 style={{ margin: 0 }}>{documentTitle}</h4>
            <button 
              className="close-preview-button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px'
              }}
              onClick={() => {
                setPdfPreview(null);
                setDocumentPreviewOpen(false);
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div 
            className="document-preview-content"
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '0'
            }}
          >
            <iframe 
              src={`${pdfPreview}#toolbar=0&navpanes=0`}
              style={{
                width: '100%',
                height: '70vh',
                border: 'none'
              }}
              title="Vista previa PDF"
            />
          </div>
          <div 
            className="document-preview-footer"
            style={{
              padding: '16px',
              borderTop: '1px solid #eaeaea',
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <a 
              href={pdfPreview} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 16px',
                backgroundColor: '#0070f3',
                color: 'white',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: 'medium',
                fontSize: '14px'
              }}
            >
              <ExternalLink size={14} style={{ marginRight: '8px' }}/>
              <span>Abrir en nueva pestaña</span>
            </a>
          </div>
        </div>
      </div>
    )}
      
      {/* Información básica */}
      <div className="facility-section">
        <h4 className="facility-section-title">Información del equipo</h4>
        <div className="facility-content">
          <div className="property-item">
            <span className="property-name">ID Equipo:</span>
            <span className="property-value">{elementInfo.elementUuid || 'No asignado'}</span>
          </div>
          <div className="property-item">
            <span className="property-name">Modelo:</span>
            <span className="property-value">{elementInfo.model || 'No especificado'}</span>
          </div>
          <div className="property-item">
            <span className="property-name">Fabricante:</span>
            <span className="property-value">{elementInfo.manufacturer || 'No especificado'}</span>
          </div>
          <div className="property-item">
            <span className="property-name">Ubicación:</span>
            <span className="property-value">{elementInfo.location || 'No especificada'}</span>
          </div>
          <div className="property-item">
            <span className="property-name">Nº Serie:</span>
            <span className="property-value">{elementInfo.serialNumber || 'No especificado'}</span>
          </div>
          
          {/* Información del proveedor */}
          <div className="property-item">
            <span className="property-name">
              <Truck size={14} className="icon-inline" /> Proveedor:
            </span>
            <span className="property-value">{elementInfo.supplier || 'No especificado'}</span>
          </div>
          <div className="property-item">
            <span className="property-name">
              <Phone size={14} className="icon-inline" /> Contacto proveedor:
            </span>
            <span className="property-value">{elementInfo.supplierContact || 'No especificado'}</span>
          </div>
          
          {elementInfo.specifications && Object.keys(elementInfo.specifications).length > 0 && (
            Object.entries(elementInfo.specifications).map(([key, value]) => (
              <div key={`spec-${key}`} className="property-item">
                <span className="property-name">{key}:</span>
                <span className="property-value">{value}</span>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Información de mantenimiento */}
      <div className="facility-section">
        <h4 className="facility-section-title">Mantenimiento</h4>
        <div className="facility-content">
          <div className="facility-status-row">
            <div className={`facility-status-indicator ${
              !elementInfo.nextMaintenanceDate || new Date(elementInfo.nextMaintenanceDate) < new Date() 
                ? 'status-warning' 
                : 'status-ok'
            }`}>
              <div className="status-icon">
                {!elementInfo.nextMaintenanceDate || new Date(elementInfo.nextMaintenanceDate) < new Date() 
                  ? <AlertCircle size={16} /> 
                  : <div className="status-dot" key="status-dot"></div>
                }
              </div>
              <div className="status-text">
                {!elementInfo.nextMaintenanceDate || new Date(elementInfo.nextMaintenanceDate) < new Date() 
                  ? 'Mantenimiento pendiente' 
                  : 'Operativo'
                }
              </div>
            </div>
          </div>
          
          <div className="property-item">
            <span className="property-name">Instalado:</span>
            <span className="property-value">{formatDate(elementInfo.installationDate)}</span>
          </div>
          <div className="property-item">
            <span className="property-name">Último mantenimiento:</span>
            <span className="property-value date-value">
              <Clock size={14} className="icon-inline" />
              {formatDate(elementInfo.lastMaintenanceDate)}
            </span>
          </div>
          <div className="property-item">
            <span className="property-name">Próximo mantenimiento:</span>
            <span className="property-value date-value">
              <Clock size={14} className="icon-inline" />
              {formatDate(elementInfo.nextMaintenanceDate)}
            </span>
          </div>
          <div className="property-item">
            <span className="property-name">Garantía hasta:</span>
            <span className="property-value date-value">
              {formatDate(elementInfo.warrantyExpiration)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Historial de mantenimiento */}
      {elementInfo.history && elementInfo.history.length > 0 && (
        <div className="facility-section">
          <h4 className="facility-section-title">Historial de mantenimiento</h4>
          <div className="facility-content">
            <div className="maintenance-history">
              {elementInfo.history
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 3) // Mostrar solo los 3 más recientes
                .map((record, index) => (
                  <div key={record._id || `history-${index}`} className="history-item">
                    <div className="history-date">{formatDate(record.date)}</div>
                    <div className="history-action">{record.action}</div>
                    <div className="history-description">{record.description}</div>
                    <div className="history-performer">Por: {record.performedBy}</div>
                  </div>
                ))
              }
              
              {elementInfo.history.length > 3 && (
                <button className="facility-link-button">
                  Ver historial completo ({elementInfo.history.length} registros)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Documentación - Sección mejorada con tamaño de fuente optimizado */}
      <div className="facility-section">
        <h4 className="facility-section-title">Documentación</h4>
        <div className="facility-content">
          {elementInfo.documents && elementInfo.documents.length > 0 ? (
            <div className="documents-list">
              {elementInfo.documents.map((doc, index) => {
                const isPdf = doc.type === 'pdf' || 
                              (doc.url && doc.url.toLowerCase && doc.url.toLowerCase().endsWith('.pdf'));
                return (
                  <div 
                    key={doc._id || `doc-${index}`} 
                    className={`document-item ${isPdf ? 'is-pdf' : ''}`}
                  >
                    <FileText size={12} className="icon-inline" />
                    <span className="document-name">{doc.name || 'Documento sin nombre'}</span>
                    <div className="document-actions">
                      <button
                        className="document-preview-button"
                        onClick={() => {
                          console.log("Mostrando documento:", doc.url);
                          setPdfPreview(doc.url);
                          setDocumentTitle(doc.name || 'Vista previa del documento');
                          setDocumentPreviewOpen(true);
                        }}
                      >
                        <Eye size={12} />
                      </button>
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="document-external-button"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-list-message">No hay documentos asociados</p>
          )}
        </div>
      </div>
      
      {/* Imágenes y Videos */}
      <div className="facility-section">
        <h4 className="facility-section-title">Multimedia</h4>
        
        {/* Imágenes */}
        <h5 className="subsection-title">Imágenes</h5>
        <div className="facility-content">
          {elementInfo.images && elementInfo.images.length > 0 ? (
            <div className="media-grid">
              {elementInfo.images.map((img, index) => (
                <div key={img._id || `img-${index}`} className="media-item">
                  <div className="media-preview" onClick={() => setImagePreview(img.url)}>
                    <img src={img.url} alt={img.name} />
                  </div>
                  <div className="media-info">
                    <span className="media-name">{img.name}</span>
                    <div className="media-actions">
                      <button 
                        className="media-button"
                        onClick={() => setImagePreview(img.url)}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list-message">No hay imágenes asociadas</p>
          )}
        </div>
        
        {/* Videos */}
        <h5 className="subsection-title">Videos</h5>
        <div className="facility-content">
          {elementInfo.videos && elementInfo.videos.length > 0 ? (
            <div className="videos-list">
              {elementInfo.videos.map((video, index) => (
                <div key={video._id || `video-${index}`} className="video-item">
                  <div className="video-info">
                    <Film size={18} className="video-icon" />
                    <div className="video-details">
                      <span className="video-name">{video.name}</span>
                      <div className="video-actions">
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="video-link"
                        >
                          <ExternalLink size={14} /> Ver
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list-message">No hay videos asociados</p>
          )}
        </div>
      </div>
      
      {/* Notas */}
      <div className="facility-section">
        <h4 className="facility-section-title">Notas</h4>
        <div className="facility-content">
          {isEditMode ? (
            <div className="notes-edit-container">
              <textarea
                className="facility-notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Añade notas sobre este elemento..."
                rows={4}
              />
              <div className="notes-actions">
                <button 
                  className="facility-action-button"
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button 
                  className="facility-action-button facility-cancel-button"
                  onClick={() => setIsEditMode(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="facility-notes">
                {notes ? notes : 'No hay notas disponibles para este elemento.'}
              </div>
              <button 
                className="facility-action-button"
                onClick={() => setIsEditMode(true)}
              >
                <Edit3 size={14} />
                <span>Editar notas</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Botón de actualización */}
      <div className="facility-actions">
        <button 
          className="facility-main-button"
          onClick={() => window.location.reload()}
        >
          <Database size={16} />
          <span>Actualizar datos desde servidor</span>
        </button>
      </div>
    </div>
  );
};

export default FacilityPanel;