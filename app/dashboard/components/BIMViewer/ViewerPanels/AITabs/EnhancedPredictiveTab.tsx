// AITabs/EnhancedPredictiveTab.tsx
import React, { useState, useEffect } from 'react';
import { Message } from '../../services/aiAssistantService';

interface EnhancedPredictiveTabProps {
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
}

interface Equipment {
  elementUuid: string;
  elementName: string;
  elementType: string;
  category: string;
  location: string;
  nextMaintenanceDate?: string;
  cost?: number;
  manufacturer?: string;
}

interface Statistics {
  totales: {
    equipos: number;
    categorias: string[];
    tipos: string[];
    fabricantes: string[];
  };
  mantenimiento: {
    vencidos: number;
    proximos: number;
    programados: number;
    sinProgramar: number;
  };
  porCategoria: Array<{
    _id: string;
    cantidad: number;
    conMantenimientoVencido: number;
  }>;
  costos: Array<{
    totalInversion: number;
    costoPromedio: number;
    equipos: number;
  }>;
}

const API_URL = process.env.API_COLLECTION || 'http://localhost:4000/api';

const EnhancedPredictiveTab: React.FC<EnhancedPredictiveTabProps> = ({
  selectedElement,
  isLoading,
  setIsLoading,
  error,
  setError,
  messages,
  setMessages,
  setActiveTab
}) => {
  const [customQuery, setCustomQuery] = useState('');
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [searchResults, setSearchResults] = useState<Equipment[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    search: '',
    category: '',
    maintenanceStatus: '',
    manufacturer: ''
  });
  const [activeSection, setActiveSection] = useState<'query' | 'analysis' | 'search' | 'stats'>('query');

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/predictive-agent/estadisticas/generales`, {
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
      const response = await fetch(`${API_URL}/predictive-agent/consulta-dinamica`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ query: customQuery })
      });

      const data = await response.json();

      if (data.status === 'success') {
        const newMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.resultado,
          timestamp: new Date()
        };

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() - 1).toString(),
            role: 'user',
            content: customQuery,
            timestamp: new Date()
          },
          newMessage
        ]);

        setCustomQuery('');
        setActiveTab('chat'); // Cambiar al tab de chat para ver la respuesta
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
        case 'maintenance':
          endpoint = 'mantenimiento/vencido';
          query = 'Análisis de mantenimiento vencido';
          break;
        case 'costs':
          endpoint = 'costos/analisis';
          query = 'Análisis de costos';
          break;
        case 'patterns':
          endpoint = 'patrones/fallos';
          query = 'Análisis de patrones de fallos';
          break;
        case 'energy':
          endpoint = 'eficiencia/energetica';
          query = 'Análisis de eficiencia energética';
          break;
        case 'calendar':
          endpoint = 'mantenimiento/calendario?periodo=trimestral';
          query = 'Calendario de mantenimiento trimestral';
          break;
        case 'improvements':
          endpoint = 'recomendaciones/mejoras';
          query = 'Recomendaciones de mejoras';
          break;
        default:
          return;
      }

      const response = await fetch(`${API_URL}/predictive-agent/${endpoint}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.status === 'success') {
        const newMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.resultado || data.reporte || data.analisis || 'Análisis completado',
          timestamp: new Date()
        };

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() - 1).toString(),
            role: 'user',
            content: query,
            timestamp: new Date()
          },
          newMessage
        ]);

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

  const searchEquipment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`${API_URL}/predictive-agent/equipos/buscar?${params}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.status === 'success') {
        setSearchResults(data.data.equipos);
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

  const analyzeSpecificEquipment = async (equipment: Equipment) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/predictive-agent/equipos/${equipment.elementUuid}/analisis`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.status === 'success') {
        const newMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.resultado || data.analisis || `Análisis del equipo ${equipment.elementName}`,
          timestamp: new Date()
        };

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() - 1).toString(),
            role: 'user',
            content: `Analizar equipo: ${equipment.elementName}`,
            timestamp: new Date()
          },
          newMessage
        ]);

        setActiveTab('chat');
      } else {
        setError(data.message || 'Error al analizar el equipo');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const getMaintenanceStatusColor = (status: string) => {
    switch (status) {
      case 'vencido': return '#ff4444';
      case 'proximo': return '#ffaa00';
      case 'programado': return '#44ff44';
      default: return '#888888';
    }
  };

  return (
    <div className="enhanced-predictive-tab">
      <h3>🧠 Análisis Predictivo Avanzado</h3>
      <p>Analiza datos reales de equipos con inteligencia artificial para obtener insights accionables.</p>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Navegación de secciones */}
      <div className="section-tabs">
        <button 
          className={`section-tab ${activeSection === 'query' ? 'active' : ''}`}
          onClick={() => setActiveSection('query')}
        >
          💬 Consulta Libre
        </button>
        <button 
          className={`section-tab ${activeSection === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveSection('analysis')}
        >
          📊 Análisis Predefinidos
        </button>
        <button 
          className={`section-tab ${activeSection === 'search' ? 'active' : ''}`}
          onClick={() => setActiveSection('search')}
        >
          🔍 Buscar Equipos
        </button>
        <button 
          className={`section-tab ${activeSection === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveSection('stats')}
        >
          📈 Estadísticas
        </button>
      </div>

      {/* Sección de Consulta Libre */}
      {activeSection === 'query' && (
        <div className="query-section">
          <h4>Consulta Personalizada</h4>
          <p>Haz cualquier pregunta sobre tus equipos y obtén análisis basado en datos reales:</p>
          
          <div className="query-examples">
            <p><strong>Ejemplos de consultas:</strong></p>
            <ul>
              <li>"¿Qué equipos HVAC necesitan mantenimiento urgente?"</li>
              <li>"Analiza los costos de mantenimiento de los sensores"</li>
              <li>"¿Cuáles son los equipos más costosos por categoría?"</li>
              <li>"Genera un calendario de mantenimiento para los próximos 6 meses"</li>
              <li>"¿Qué equipos han tenido más fallos este año?"</li>
              <li>"Recomienda mejoras para optimizar costos energéticos"</li>
            </ul>
          </div>
          
          <div className="query-input-section">
            <textarea
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Escribe tu consulta aquí... Por ejemplo: '¿Qué equipos de climatización necesitan atención urgente?'"
              className="query-textarea"
              rows={4}
              disabled={isLoading}
            />
            <button 
              onClick={processCustomQuery}
              className="query-submit-button"
              disabled={isLoading || !customQuery.trim()}
            >
              {isLoading ? '🔄 Analizando...' : '🚀 Analizar con IA'}
            </button>
          </div>
        </div>
      )}

      {/* Sección de Análisis Predefinidos */}
      {activeSection === 'analysis' && (
        <div className="analysis-section">
          <h4>Análisis Predefinidos</h4>
          <p>Ejecuta análisis especializados con un solo clic:</p>
          
          <div className="analysis-grid">
            <div className="analysis-card">
              <div className="analysis-icon">⚠️</div>
              <h5>Mantenimiento Vencido</h5>
              <p>Identifica equipos con mantenimiento atrasado y prioriza acciones.</p>
              <button 
                onClick={() => runPresetAnalysis('maintenance')}
                className="analysis-button"
                disabled={isLoading}
              >
                Analizar
              </button>
            </div>

            <div className="analysis-card">
              <div className="analysis-icon">💰</div>
              <h5>Análisis de Costos</h5>
              <p>Evalúa inversiones, costos de mantenimiento y oportunidades de ahorro.</p>
              <button 
                onClick={() => runPresetAnalysis('costs')}
                className="analysis-button"
                disabled={isLoading}
              >
                Analizar
              </button>
            </div>

            <div className="analysis-card">
              <div className="analysis-icon">🔍</div>
              <h5>Patrones de Fallos</h5>
              <p>Identifica equipos problemáticos y patrones recurrentes.</p>
              <button 
                onClick={() => runPresetAnalysis('patterns')}
                className="analysis-button"
                disabled={isLoading}
              >
                Analizar
              </button>
            </div>

            <div className="analysis-card">
              <div className="analysis-icon">⚡</div>
              <h5>Eficiencia Energética</h5>
              <p>Analiza consumo energético y recomienda optimizaciones.</p>
              <button 
                onClick={() => runPresetAnalysis('energy')}
                className="analysis-button"
                disabled={isLoading}
              >
                Analizar
              </button>
            </div>

            <div className="analysis-card">
              <div className="analysis-icon">📅</div>
              <h5>Calendario de Mantenimiento</h5>
              <p>Genera un calendario optimizado de mantenimientos futuros.</p>
              <button 
                onClick={() => runPresetAnalysis('calendar')}
                className="analysis-button"
                disabled={isLoading}
              >
                Generar
              </button>
            </div>

            <div className="analysis-card">
              <div className="analysis-icon">🎯</div>
              <h5>Recomendaciones</h5>
              <p>Obtén sugerencias estratégicas para mejorar la gestión.</p>
              <button 
                onClick={() => runPresetAnalysis('improvements')}
                className="analysis-button"
                disabled={isLoading}
              >
                Generar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Búsqueda de Equipos */}
      {activeSection === 'search' && (
        <div className="search-section">
          <h4>Buscar Equipos</h4>
          <p>Encuentra equipos específicos usando filtros avanzados:</p>
          
          <div className="search-filters">
            <div className="filter-group">
              <label>Búsqueda general:</label>
              <input
                type="text"
                value={searchFilters.search}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Nombre, tipo o ubicación..."
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Categoría:</label>
              <select
                value={searchFilters.category}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, category: e.target.value }))}
                className="filter-select"
              >
                <option value="">Todas las categorías</option>
                <option value="HVAC">HVAC</option>
                <option value="Electrical">Eléctricos</option>
                <option value="Lighting">Iluminación</option>
                <option value="Sensors">Sensores</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Estado de mantenimiento:</label>
              <select
                value={searchFilters.maintenanceStatus}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, maintenanceStatus: e.target.value }))}
                className="filter-select"
              >
                <option value="">Todos los estados</option>
                <option value="vencido">Vencido</option>
                <option value="proximo">Próximo (30 días)</option>
                <option value="programado">Programado</option>
                <option value="sinProgramar">Sin programar</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Fabricante:</label>
              <input
                type="text"
                value={searchFilters.manufacturer}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, manufacturer: e.target.value }))}
                placeholder="Nombre del fabricante..."
                className="filter-input"
              />
            </div>

            <button 
              onClick={searchEquipment}
              className="search-button"
              disabled={isLoading}
            >
              {isLoading ? '🔄 Buscando...' : '🔍 Buscar'}
            </button>
          </div>

          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h5>Resultados encontrados: {searchResults.length}</h5>
              <div className="equipment-list">
                {searchResults.map((equipment) => (
                  <div key={equipment.elementUuid} className="equipment-card">
                    <div className="equipment-header">
                      <h6>{equipment.elementName}</h6>
                      <span className="equipment-category">{equipment.category}</span>
                    </div>
                    <div className="equipment-details">
                      <p><strong>Tipo:</strong> {equipment.elementType}</p>
                      <p><strong>Ubicación:</strong> {equipment.location}</p>
                      {equipment.manufacturer && (
                        <p><strong>Fabricante:</strong> {equipment.manufacturer}</p>
                      )}
                      {equipment.nextMaintenanceDate && (
                        <p><strong>Próximo mantenimiento:</strong> {formatDate(equipment.nextMaintenanceDate)}</p>
                      )}
                      {equipment.cost && (
                        <p><strong>Costo:</strong> {formatCurrency(equipment.cost)}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => analyzeSpecificEquipment(equipment)}
                      className="analyze-equipment-button"
                      disabled={isLoading}
                    >
                      📊 Analizar este equipo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sección de Estadísticas */}
      {activeSection === 'stats' && (
        <div className="stats-section">
          <h4>Estadísticas del Sistema</h4>
          
          {statistics ? (
            <div className="stats-dashboard">
              {/* Resumen general */}
              <div className="stats-card">
                <h5>📊 Resumen General</h5>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">{statistics.totales.equipos}</span>
                    <span className="stat-label">Total Equipos</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{statistics.totales.categorias.length}</span>
                    <span className="stat-label">Categorías</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{statistics.totales.tipos.length}</span>
                    <span className="stat-label">Tipos</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{statistics.totales.fabricantes.length}</span>
                    <span className="stat-label">Fabricantes</span>
                  </div>
                </div>
              </div>

              {/* Estado de mantenimiento */}
              <div className="stats-card">
                <h5>🔧 Estado de Mantenimiento</h5>
                <div className="maintenance-stats">
                  <div className="maintenance-item vencido">
                    <span className="maintenance-count">{statistics.mantenimiento.vencidos}</span>
                    <span className="maintenance-label">Vencidos</span>
                  </div>
                  <div className="maintenance-item proximo">
                    <span className="maintenance-count">{statistics.mantenimiento.proximos}</span>
                    <span className="maintenance-label">Próximos</span>
                  </div>
                  <div className="maintenance-item programado">
                    <span className="maintenance-count">{statistics.mantenimiento.programados}</span>
                    <span className="maintenance-label">Programados</span>
                  </div>
                  <div className="maintenance-item sin-programar">
                    <span className="maintenance-count">{statistics.mantenimiento.sinProgramar}</span>
                    <span className="maintenance-label">Sin Programar</span>
                  </div>
                </div>
              </div>

              {/* Distribución por categoría */}
              <div className="stats-card">
                <h5>🏗️ Distribución por Categoría</h5>
                <div className="category-stats">
                  {statistics.porCategoria.map((categoria) => (
                    <div key={categoria._id} className="category-item">
                      <div className="category-header">
                        <span className="category-name">{categoria._id || 'Sin categoría'}</span>
                        <span className="category-count">{categoria.cantidad}</span>
                      </div>
                      {categoria.conMantenimientoVencido > 0 && (
                        <div className="category-alert">
                          ⚠️ {categoria.conMantenimientoVencido} con mantenimiento vencido
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Información de costos */}
              {statistics.costos && statistics.costos.length > 0 && (
                <div className="stats-card">
                  <h5>💰 Información de Costos</h5>
                  <div className="cost-stats">
                    <div className="cost-item">
                      <span className="cost-label">Inversión Total:</span>
                      <span className="cost-value">{formatCurrency(statistics.costos[0].totalInversion)}</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">Costo Promedio:</span>
                      <span className="cost-value">{formatCurrency(statistics.costos[0].costoPromedio)}</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">Equipos con Costo:</span>
                      <span className="cost-value">{statistics.costos[0].equipos}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Acciones rápidas */}
              <div className="stats-card">
                <h5>⚡ Acciones Rápidas</h5>
                <div className="quick-actions">
                  {statistics.mantenimiento.vencidos > 0 && (
                    <button 
                      onClick={() => runPresetAnalysis('maintenance')}
                      className="quick-action-button urgent"
                      disabled={isLoading}
                    >
                      🚨 Ver equipos vencidos ({statistics.mantenimiento.vencidos})
                    </button>
                  )}
                  {statistics.mantenimiento.proximos > 0 && (
                    <button 
                      onClick={() => runPresetAnalysis('calendar')}
                      className="quick-action-button warning"
                      disabled={isLoading}
                    >
                      📅 Planificar próximos ({statistics.mantenimiento.proximos})
                    </button>
                  )}
                  <button 
                    onClick={() => runPresetAnalysis('costs')}
                    className="quick-action-button info"
                    disabled={isLoading}
                  >
                    💰 Análisis de costos completo
                  </button>
                  <button 
                    onClick={() => runPresetAnalysis('improvements')}
                    className="quick-action-button success"
                    disabled={isLoading}
                  >
                    🎯 Obtener recomendaciones
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="loading-stats">
              <p>Cargando estadísticas...</p>
              <button onClick={loadStatistics} className="reload-stats-button">
                🔄 Recargar
              </button>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Procesando análisis con IA...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPredictiveTab;