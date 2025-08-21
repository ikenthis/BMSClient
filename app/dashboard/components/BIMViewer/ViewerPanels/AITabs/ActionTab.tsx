// AITabs/SpaceManagementTab.tsx
import React, { useState, useEffect } from 'react';
import { Message } from '../../services/aiAssistantService';

interface SpaceManagementTabProps {
  selectedElement?: any;
  modelData?: any;
  elementsData?: any;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setActiveTab: (tab: string) => void;
  generateUniqueId: () => string;
}

interface Space {
  elementUuid: string;
  elementName: string;
  location: string;
  actividadesRecientes?: any[];
  obrasEnEspacio?: any[];
  estadisticas?: {
    totalActividades: number;
    totalObras: number;
    obrasEnProceso: number;
  };
}

interface Activity {
  scheduleId: string;
  title: string;
  spaceName: string;
  activityType: string;
  startDate: string;
  endDate: string;
  status: string;
  responsible?: {
    name: string;
    email: string;
  };
}

interface Artwork {
  itemId: string;
  name: string;
  type: string;
  spaceName: string;
  restaurationSchedule?: {
    status: string;
    startDate?: string;
    endDate?: string;
  };
  conservationState?: {
    currentState?: {
      rating: number;
      description: string;
    };
  };
}

interface Statistics {
  resumenGeneral: {
    totalEspacios: number;
    totalActividades: number;
    totalObras: number;
    actividadesEsteMes: number;
    obrasEnRestauracion: number;
  };
  distribucionActividades: Record<string, number>;
  estadosRestauracion: Record<string, number>;
  indicadores: {
    tasaOcupacionMensual: string;
    promedioActividadesPorEspacio: string;
    porcentajeObrasEnProceso: string;
  };
  alertas: {
    espaciosSinActividad: number;
    obrasRetrasadas: number;
  };
}

const API_URL = process.env.API_COLLECTION || 'http://localhost:4000/api';

const SpaceManagementTab: React.FC<SpaceManagementTabProps> = ({
  isLoading,
  setIsLoading,
  error,
  setError,
  messages,
  setMessages,
  setActiveTab,
  generateUniqueId
}) => {
  const [customQuery, setCustomQuery] = useState('');
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [activeSection, setActiveSection] = useState<'query' | 'overview' | 'spaces' | 'activities' | 'artworks'>('overview');
  const [searchFilters, setSearchFilters] = useState({
    spaceSearch: '',
    activityType: '',
    artworkStatus: '',
    dateRange: 'month'
  });

  // Cargar estadísticas al montar
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/space-management/estadisticas/generales`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setStatistics(data.data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const processCustomQuery = async () => {
    if (!customQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/space-management/consulta-dinamica`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ query: customQuery })
      });

      const data = await response.json();

      if (data.status === 'success') {
        const userMessage: Message = {
          id: generateUniqueId(),
          role: 'user',
          content: customQuery,
          timestamp: new Date()
        };

        const assistantMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: data.resultado,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);
        setCustomQuery('');
        setActiveTab('chat');
      } else {
        setError(data.message || 'Error al procesar la consulta');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const runPresetAnalysis = async (analysisType: string) => {
    setIsLoading(true);
    setError(null);

    try {
      let endpoint = '';
      let query = '';

      switch (analysisType) {
        case 'occupancy':
          endpoint = 'ocupacion/analisis?periodo=mes';
          query = 'Análisis de ocupación de espacios del último mes';
          break;
        case 'conflicts':
          endpoint = 'conflictos/detectar';
          query = 'Detección de conflictos entre actividades y restauraciones';
          break;
        case 'risks':
          endpoint = 'riesgos/evaluar';
          query = 'Evaluación de riesgos para el patrimonio';
          break;
        case 'productivity':
          endpoint = 'productividad/informe?periodo=trimestre';
          query = 'Informe de productividad del último trimestre';
          break;
        case 'distribution':
          endpoint = 'obras/distribucion';
          query = 'Recomendaciones para distribución de obras';
          break;
        case 'maintenance':
          endpoint = 'mantenimiento/planificar';
          query = 'Planificación de mantenimiento de espacios';
          break;
        case 'trends':
          endpoint = 'tendencias/uso?periodo=6meses';
          query = 'Análisis de tendencias de uso de los últimos 6 meses';
          break;
        case 'calendar':
          endpoint = 'calendario/optimizar?periodo=trimestre';
          query = 'Optimización del calendario de actividades';
          break;
        default:
          return;
      }

      const response = await fetch(`${API_URL}/space-management/${endpoint}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.status === 'success') {
        const userMessage: Message = {
          id: generateUniqueId(),
          role: 'user',
          content: query,
          timestamp: new Date()
        };

        const assistantMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: data.resultado || data.analisis || formatAnalysisResult(data),
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);
        setActiveTab('chat');
      } else {
        setError(data.message || 'Error al realizar el análisis');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAnalysisResult = (data: any) => {
    // Formatear resultados específicos según el tipo de análisis
    if (data.distribucionActual) {
      return `**Distribución de Obras**\n\n${Object.values(data.distribucionActual).map((espacio: any) => 
        `- ${espacio.espacioNombre}: ${espacio.cargaTotal} obras\n`
      ).join('')}`;
    }
    
    if (data.conflictos) {
      return `**Conflictos Detectados: ${data.totalConflictos}**\n\n${data.conflictos.map((c: any) => 
        `- ${c.tipo}: ${c.espacio}\n`
      ).join('')}`;
    }
    
    return JSON.stringify(data, null, 2);
  };

  const searchSpaces = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search: searchFilters.spaceSearch,
        limit: '20'
      });

      const response = await fetch(`${API_URL}/space-management/espacios/buscar?${params}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.status === 'success') {
        setSpaces(data.data.espacios);
      } else {
        setError(data.message || 'Error en la búsqueda');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSpecificSpace = async (space: Space) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/space-management/espacios/${space.elementUuid}/analisis`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.status === 'success') {
        const userMessage: Message = {
          id: generateUniqueId(),
          role: 'user',
          content: `Analizar espacio: ${space.elementName}`,
          timestamp: new Date()
        };

        const assistantMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: data.resultado || data.analisis?.resultado || `Análisis del espacio ${space.elementName}`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);
        setActiveTab('chat');
      } else {
        setError(data.message || 'Error al analizar el espacio');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Pendiente': '#ffaa00',
      'En proceso': '#4169e1',
      'Completada': '#44ff44',
      'Cancelada': '#ff4444',
      'Programada': '#44ff44',
      'vencido': '#ff4444',
      'proximo': '#ffaa00'
    };
    return colors[status] || '#888888';
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      'formativo': '📚',
      'visita': '👥',
      'exposición': '🎨',
      'investigación': '🔬',
      'restauración': '🔧',
      'mantenimiento': '🛠️'
    };
    return icons[type.toLowerCase()] || '📅';
  };

  return (
    <div className="space-management-tab">
      <h3>🏛️ Gestión de Espacios IPCE</h3>
      <p>Sistema inteligente para la gestión integral de espacios, actividades y obras del patrimonio cultural.</p>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="error-dismiss">✕</button>
        </div>
      )}

      {/* Navegación de secciones */}
      <div className="section-tabs">
        <button 
          className={`section-tab ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          📊 Vista General
        </button>
        <button 
          className={`section-tab ${activeSection === 'query' ? 'active' : ''}`}
          onClick={() => setActiveSection('query')}
        >
          💬 Consulta IA
        </button>
        <button 
          className={`section-tab ${activeSection === 'spaces' ? 'active' : ''}`}
          onClick={() => setActiveSection('spaces')}
        >
          🏛️ Espacios
        </button>
        <button 
          className={`section-tab ${activeSection === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveSection('activities')}
        >
          📅 Actividades
        </button>
        <button 
          className={`section-tab ${activeSection === 'artworks' ? 'active' : ''}`}
          onClick={() => setActiveSection('artworks')}
        >
          🎨 Obras
        </button>
      </div>

      {/* Vista General */}
      {activeSection === 'overview' && statistics && (
        <div className="overview-section">
          <h4>Vista General del Sistema</h4>
          
          {/* Cards de resumen */}
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">🏛️</div>
              <div className="stat-content">
                <span className="stat-number">{statistics.resumenGeneral.totalEspacios}</span>
                <span className="stat-label">Espacios Totales</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <span className="stat-number">{statistics.resumenGeneral.totalActividades}</span>
                <span className="stat-label">Actividades Programadas</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎨</div>
              <div className="stat-content">
                <span className="stat-number">{statistics.resumenGeneral.totalObras}</span>
                <span className="stat-label">Obras en Colección</span>
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <span className="stat-number">{statistics.resumenGeneral.obrasEnRestauracion}</span>
                <span className="stat-label">En Restauración</span>
              </div>
            </div>
          </div>

          {/* Alertas y acciones rápidas */}
          <div className="alerts-section">
            <h5>🚨 Alertas y Acciones Rápidas</h5>
            <div className="alert-cards">
              {statistics.alertas.obrasRetrasadas > 0 && (
                <div className="alert-card urgent">
                  <span className="alert-icon">⏰</span>
                  <span className="alert-text">
                    {statistics.alertas.obrasRetrasadas} obras con restauración retrasada
                  </span>
                  <button 
                    onClick={() => runPresetAnalysis('risks')}
                    className="alert-action-btn"
                    disabled={isLoading}
                  >
                    Evaluar Riesgos
                  </button>
                </div>
              )}

              {statistics.alertas.espaciosSinActividad > 0 && (
                <div className="alert-card warning">
                  <span className="alert-icon">📍</span>
                  <span className="alert-text">
                    {statistics.alertas.espaciosSinActividad} espacios sin actividad programada
                  </span>
                  <button 
                    onClick={() => runPresetAnalysis('occupancy')}
                    className="alert-action-btn"
                    disabled={isLoading}
                  >
                    Analizar Ocupación
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Análisis rápidos */}
          <div className="quick-analysis-section">
            <h5>⚡ Análisis Rápidos</h5>
            <div className="analysis-grid">
              <button 
                onClick={() => runPresetAnalysis('conflicts')}
                className="analysis-card-btn"
                disabled={isLoading}
              >
                <span className="analysis-icon">⚠️</span>
                <span className="analysis-title">Detectar Conflictos</span>
                <span className="analysis-desc">Entre actividades y restauraciones</span>
              </button>

              <button 
                onClick={() => runPresetAnalysis('productivity')}
                className="analysis-card-btn"
                disabled={isLoading}
              >
                <span className="analysis-icon">📊</span>
                <span className="analysis-title">Productividad</span>
                <span className="analysis-desc">Informe del último trimestre</span>
              </button>

              <button 
                onClick={() => runPresetAnalysis('distribution')}
                className="analysis-card-btn"
                disabled={isLoading}
              >
                <span className="analysis-icon">🎯</span>
                <span className="analysis-title">Distribución Óptima</span>
                <span className="analysis-desc">Recomendaciones para obras</span>
              </button>

              <button 
                onClick={() => runPresetAnalysis('maintenance')}
                className="analysis-card-btn"
                disabled={isLoading}
              >
                <span className="analysis-icon">🔧</span>
                <span className="analysis-title">Mantenimiento</span>
                <span className="analysis-desc">Planificación preventiva</span>
              </button>

              <button 
                onClick={() => runPresetAnalysis('trends')}
                className="analysis-card-btn"
                disabled={isLoading}
              >
                <span className="analysis-icon">📈</span>
                <span className="analysis-title">Tendencias</span>
                <span className="analysis-desc">Análisis de uso histórico</span>
              </button>

              <button 
                onClick={() => runPresetAnalysis('calendar')}
                className="analysis-card-btn"
                disabled={isLoading}
              >
                <span className="analysis-icon">📅</span>
                <span className="analysis-title">Optimizar Calendario</span>
                <span className="analysis-desc">Próximo trimestre</span>
              </button>
            </div>
          </div>

          {/* Indicadores clave */}
          {statistics.indicadores && (
            <div className="kpi-section">
              <h5>📈 Indicadores Clave</h5>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span className="kpi-label">Tasa de Ocupación Mensual</span>
                  <span className="kpi-value">{statistics.indicadores.tasaOcupacionMensual}%</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Promedio Actividades/Espacio</span>
                  <span className="kpi-value">{statistics.indicadores.promedioActividadesPorEspacio}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Obras en Proceso</span>
                  <span className="kpi-value">{statistics.indicadores.porcentajeObrasEnProceso}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consulta IA */}
      {activeSection === 'query' && (
        <div className="query-section">
          <h4>Consulta Inteligente con IA</h4>
          <p>Realiza consultas complejas sobre espacios, actividades y obras del IPCE:</p>
          
          <div className="query-examples">
            <p><strong>Ejemplos de consultas:</strong></p>
            <ul>
              <li>"¿Qué actividades están programadas para la próxima semana en la Sala de Exposiciones?"</li>
              <li>"Analiza los conflictos entre restauraciones y visitas guiadas"</li>
              <li>"¿Cuáles son los espacios más utilizados para actividades formativas?"</li>
              <li>"Evalúa los riesgos para las obras en proceso de restauración"</li>
              <li>"Optimiza la distribución de obras considerando el flujo de visitantes"</li>
              <li>"¿Qué espacios requieren mantenimiento urgente?"</li>
              <li>"Genera un informe de productividad de los talleres de restauración"</li>
              <li>"Analiza las tendencias de uso de espacios en los últimos 6 meses"</li>
            </ul>
          </div>
          
          <div className="query-input-section">
            <textarea
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Escribe tu consulta aquí... Por ejemplo: '¿Hay conflictos entre las actividades programadas y los trabajos de restauración en curso?'"
              className="query-textarea"
              rows={4}
              disabled={isLoading}
            />
            <button 
              onClick={processCustomQuery}
              className="query-submit-button"
              disabled={isLoading || !customQuery.trim()}
            >
              {isLoading ? '🔄 Analizando...' : '🚀 Consultar con IA'}
            </button>
          </div>
        </div>
      )}

      {/* Gestión de Espacios */}
      {activeSection === 'spaces' && (
        <div className="spaces-section">
          <h4>Gestión de Espacios</h4>
          
          <div className="search-section">
            <input
              type="text"
              value={searchFilters.spaceSearch}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, spaceSearch: e.target.value }))}
              placeholder="Buscar espacios por nombre o ubicación..."
              className="search-input"
            />
            <button 
              onClick={searchSpaces}
              className="search-button"
              disabled={isLoading}
            >
              🔍 Buscar
            </button>
          </div>

          {spaces.length > 0 && (
            <div className="spaces-list">
              {spaces.map((space) => (
                <div key={space.elementUuid} className="space-card">
                  <div className="space-header">
                    <h5>{space.elementName}</h5>
                    <span className="space-location">{space.location}</span>
                  </div>
                  
                  {space.estadisticas && (
                    <div className="space-stats">
                      <span className="stat-item">
                        📅 {space.estadisticas.totalActividades} actividades
                      </span>
                      <span className="stat-item">
                        🎨 {space.estadisticas.totalObras} obras
                      </span>
                      {space.estadisticas.obrasEnProceso > 0 && (
                        <span className="stat-item warning">
                          ⚠️ {space.estadisticas.obrasEnProceso} en proceso
                        </span>
                      )}
                    </div>
                  )}
                  
                  <button 
                    onClick={() => analyzeSpecificSpace(space)}
                    className="analyze-space-button"
                    disabled={isLoading}
                  >
                    📊 Analizar este espacio
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gestión de Actividades */}
      {activeSection === 'activities' && (
        <div className="activities-section">
          <h4>Gestión de Actividades</h4>
          
          <div className="filter-section">
            <select
              value={searchFilters.activityType}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, activityType: e.target.value }))}
              className="filter-select"
            >
              <option value="">Todos los tipos</option>
              <option value="formativo">Formativo</option>
              <option value="visita">Visitas</option>
              <option value="exposición">Exposiciones</option>
              <option value="investigación">Investigación</option>
              <option value="restauración">Restauración</option>
            </select>
            
            <select
              value={searchFilters.dateRange}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="filter-select"
            >
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="quarter">Este trimestre</option>
              <option value="year">Este año</option>
            </select>
          </div>

          <div className="activities-timeline">
            <h5>📅 Próximas Actividades</h5>
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.scheduleId} className="activity-card">
                  <div className="activity-header">
                    <span className="activity-icon">{getActivityIcon(activity.activityType)}</span>
                    <h6>{activity.title}</h6>
                    <span 
                      className="activity-status"
                      style={{ backgroundColor: getStatusColor(activity.status) }}
                    >
                      {activity.status}
                    </span>
                  </div>
                  <div className="activity-details">
                    <p><strong>Espacio:</strong> {activity.spaceName}</p>
                    <p><strong>Fecha:</strong> {formatDate(activity.startDate)} - {formatDate(activity.endDate)}</p>
                    {activity.responsible && (
                      <p><strong>Responsable:</strong> {activity.responsible.name}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No hay actividades cargadas. Usa el análisis de IA para consultar el calendario.</p>
            )}
          </div>
        </div>
      )}

      {/* Gestión de Obras */}
      {activeSection === 'artworks' && (
        <div className="artworks-section">
          <h4>Gestión de Obras y Colecciones</h4>
          
          <div className="filter-section">
            <select
              value={searchFilters.artworkStatus}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, artworkStatus: e.target.value }))}
              className="filter-select"
            >
              <option value="">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En proceso">En proceso</option>
              <option value="Completada">Completada</option>
            </select>
          </div>

          <div className="artworks-grid">
            {artworks.length > 0 ? (
              artworks.map((artwork) => (
                <div key={artwork.itemId} className="artwork-card">
                  <div className="artwork-header">
                    <h6>{artwork.name}</h6>
                    <span className="artwork-type">{artwork.type}</span>
                  </div>
                  <div className="artwork-details">
                    <p><strong>Ubicación:</strong> {artwork.spaceName}</p>
                    {artwork.restaurationSchedule && (
                      <div className="restoration-info">
                        <p>
                          <strong>Estado restauración:</strong> 
                          <span 
                            className="restoration-status"
                            style={{ color: getStatusColor(artwork.restaurationSchedule.status) }}
                          >
                            {artwork.restaurationSchedule.status}
                          </span>
                        </p>
                        {artwork.restaurationSchedule.endDate && (
                          <p><strong>Fecha fin:</strong> {formatDate(artwork.restaurationSchedule.endDate)}</p>
                        )}
                      </div>
                    )}
                    {artwork.conservationState?.currentState && (
                      <div className="conservation-info">
                        <p>
                          <strong>Estado conservación:</strong> 
                          <span className="conservation-rating">
                            {artwork.conservationState.currentState.rating}/10
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No hay obras cargadas. Usa el análisis de IA para consultar el estado de las obras.</p>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Procesando con el agente de espacios IPCE...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceManagementTab;