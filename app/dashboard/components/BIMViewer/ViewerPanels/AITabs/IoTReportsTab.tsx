// AITabs/IoTReportsTab.tsx - Versión actualizada con axios y panel mejorado
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Message } from '../../services/aiAssistantService';
import './styles/IoTReportsTab.css';

interface IoTReportsTabProps {
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
  onClose?: () => void; // Nueva prop para cerrar el panel
}

interface ReportInfo {
  fileName: string;
  tipo: string;
  fechaGeneracion: string;
  tamaño: number;
  downloadUrl: string;
  previewUrl: string;
  deleteUrl: string;
}

interface ReportGenerationResult {
  success: boolean;
  fileName: string;
  filePath: string;
  reportType: string;
  generatedAt: string;
  sections: string[];
}

// URL directa de la API
const API_URL_REPORTS = 'http://localhost:4000/api';

// Configuración axios con interceptores para manejo de errores
const axiosInstance = axios.create({
  baseURL: API_URL_REPORTS,
  withCredentials: true,
  timeout: 30000, // 30 segundos timeout
});

// Interceptor para manejo de errores globales
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Error de axios:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout - El servidor está tardando mucho en responder');
    }
    if (error.response?.status === 500) {
      throw new Error('Error interno del servidor');
    }
    if (error.response?.status === 404) {
      throw new Error('Endpoint no encontrado');
    }
    throw error;
  }
);

const IoTReportsTab: React.FC<IoTReportsTabProps> = ({
  isLoading,
  setIsLoading,
  error,
  setError,
  messages,
  setMessages,
  setActiveTab,
  generateUniqueId,
  onClose
}) => {
  const [availableReports, setAvailableReports] = useState<ReportInfo[]>([]);
  const [activeSection, setActiveSection] = useState<'generate' | 'manage' | 'custom'>('generate');
  const [customQuery, setCustomQuery] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('ejecutivo');
  const [selectedPeriod, setSelectedPeriod] = useState('semana');
  const [generatingMultiple, setGeneratingMultiple] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Cargar reportes disponibles al montar
  useEffect(() => {
    loadAvailableReports();
  }, []);

  const loadAvailableReports = async () => {
    setLoadingReports(true);
    try {
      const response = await axiosInstance.get('/iot-reports/listar');
      
      if (response.data.status === 'success') {
        setAvailableReports(response.data.reportes || []);
      } else {
        console.warn('No se pudieron cargar los reportes:', response.data.message);
        setAvailableReports([]);
      }
    } catch (error: any) {
      console.error('Error al cargar reportes:', error);
      setError(`Error al cargar reportes: ${error.message}`);
      setAvailableReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const generateSingleReport = async (type: string, period: string = 'semana') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(`/iot-reports/generar?tipo=${type}&periodo=${period}`);

      if (response.data.status === 'success') {
        // Actualizar lista de reportes
        await loadAvailableReports();
        
        // Abrir reporte automáticamente si hay URL
        if (response.data.previewUrl) {
          window.open(response.data.previewUrl, '_blank');
        }
        
        // Mostrar mensaje de éxito en el chat
        const successMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: `✅ **Reporte ${getReportTypeName(type)} generado exitosamente**\n\n` +
                   `📊 **Tipo:** ${getReportTypeName(type)}\n` +
                   `📅 **Período:** ${period}\n` +
                   `📄 **Archivo:** ${response.data.reporte?.fileName || 'Reporte generado'}\n` +
                   `⏰ **Generado:** ${new Date().toLocaleString('es-ES')}\n\n` +
                   `🔗 **[Ver reporte en nueva ventana](${response.data.previewUrl || '#'})**\n` +
                   `📥 **[Descargar archivo HTML](${response.data.downloadUrl || '#'})**\n\n` +
                   `El reporte incluye:\n` +
                   `• Análisis con IA de los datos IoT\n` +
                   `• Gráficos interactivos y visualizaciones\n` +
                   `• Recomendaciones específicas\n` +
                   `• KPIs y métricas clave\n` +
                   `• Formato profesional listo para presentar`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setActiveTab('chat');
      } else {
        setError(response.data.message || 'Error al generar reporte');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(`Error de conexión: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCompleteSuite = async () => {
    setGeneratingMultiple(true);
    setError(null);

    try {
      const response = await axiosInstance.post(`/iot-reports/generar-completo?periodo=${selectedPeriod}`);

      if (response.data.status === 'success') {
        // Actualizar lista de reportes
        await loadAvailableReports();
        
        // Mostrar resultados en el chat
        const successMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: `🎉 **Suite completa de reportes generada**\n\n` +
                   `📊 **Reportes generados:** ${response.data.totalGenerados || 0}/${response.data.totalSolicitados || 0}\n` +
                   `📅 **Período:** ${selectedPeriod}\n` +
                   `⏰ **Completado:** ${new Date().toLocaleString('es-ES')}\n\n` +
                   `**Reportes disponibles:**\n` +
                   (response.data.reportes || []).map((r: any) => 
                     r.success ? 
                       `✅ ${getReportTypeName(r.tipo)}: [Ver](${r.previewUrl || '#'}) | [Descargar](${r.downloadUrl || '#'})` :
                       `❌ ${getReportTypeName(r.tipo)}: ${r.error || 'Error desconocido'}`
                   ).join('\n') +
                   `\n\n💡 **Tip:** Puedes acceder a todos los reportes desde la pestaña "Gestionar Reportes"`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setActiveTab('chat');
      } else {
        setError(response.data.message || 'Error al generar suite de reportes');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(`Error de conexión: ${error.message}`);
    } finally {
      setGeneratingMultiple(false);
    }
  };

  const generateCustomReport = async () => {
    if (!customQuery.trim()) {
      setError('Por favor ingresa una consulta para el reporte personalizado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post('/iot-reports/generar-personalizado', {
        consulta: customQuery,
        periodo: selectedPeriod,
        incluirGraficos: true
      });

      if (response.data.status === 'success') {
        // Actualizar lista de reportes
        await loadAvailableReports();
        
        // Abrir reporte automáticamente si hay URL
        if (response.data.previewUrl) {
          window.open(response.data.previewUrl, '_blank');
        }
        
        // Mostrar mensaje de éxito
        const successMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: `🤖 **Reporte personalizado generado con IA**\n\n` +
                   `💭 **Consulta:** "${response.data.consultaOriginal || customQuery}"\n` +
                   `📄 **Archivo:** ${response.data.reporte?.fileName || 'Reporte personalizado'}\n` +
                   `📅 **Período:** ${selectedPeriod}\n` +
                   `⏰ **Generado:** ${new Date().toLocaleString('es-ES')}\n\n` +
                   `🔗 **[Ver reporte en nueva ventana](${response.data.previewUrl || '#'})**\n` +
                   `📥 **[Descargar archivo HTML](${response.data.downloadUrl || '#'})**\n\n` +
                   `Este reporte ha sido creado específicamente según tu consulta, incluyendo:\n` +
                   `• Análisis IA personalizado\n` +
                   `• Visualizaciones relevantes\n` +
                   `• Insights específicos a tu pregunta\n` +
                   `• Recomendaciones contextuales`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setCustomQuery('');
        setActiveTab('chat');
      } else {
        setError(response.data.message || 'Error al generar reporte personalizado');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(`Error de conexión: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReport = async (fileName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el reporte "${fileName}"?`)) {
      return;
    }

    try {
      const response = await axiosInstance.delete(`/iot-reports/eliminar/${fileName}`);

      if (response.data.status === 'success') {
        // Actualizar lista de reportes
        await loadAvailableReports();
        
        // Mostrar mensaje de confirmación
        const confirmMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: `🗑️ **Reporte eliminado**\n\nEl reporte "${fileName}" ha sido eliminado exitosamente.`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, confirmMessage]);
      } else {
        setError(response.data.message || 'Error al eliminar reporte');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(`Error de conexión: ${error.message}`);
    }
  };

  const cleanOldReports = async () => {
    if (!confirm('¿Quieres eliminar todos los reportes anteriores a 30 días?')) {
      return;
    }

    try {
      const response = await axiosInstance.post('/iot-reports/limpiar-antiguos?dias=30');

      if (response.data.status === 'success') {
        await loadAvailableReports();
        
        const cleanMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: `🧹 **Limpieza completada**\n\n${response.data.message || 'Reportes antiguos eliminados correctamente'}`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, cleanMessage]);
      } else {
        setError(response.data.message || 'Error al limpiar reportes');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(`Error de conexión: ${error.message}`);
    }
  };

  const getReportTypeName = (type: string): string => {
    const names: Record<string, string> = {
      'ejecutivo': 'Ejecutivo',
      'ambiental': 'Ambiental',
      'mantenimiento': 'Mantenimiento',
      'eficiencia': 'Eficiencia Energética',
      'anomalias': 'Detección de Anomalías',
      'confort': 'Confort de Ocupantes',
      'personalizado': 'Personalizado'
    };
    return names[type] || type;
  };

  const getReportIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'ejecutivo': '📊',
      'ambiental': '🌡️',
      'mantenimiento': '🔧',
      'eficiencia': '⚡',
      'anomalias': '🚨',
      'confort': '😊',
      'personalizado': '🎯'
    };
    return icons[type] || '📄';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`iot-reports-container iot-reports-panel ${isMinimized ? 'minimized' : ''}`}>
      {/* Header del panel con controles */}
      <div className="iot-panel-header">
        <div className="iot-panel-title">
          <span className="iot-panel-icon">📋</span>
          <h3>Sistema de Reportes IoT</h3>
        </div>
        <div className="iot-panel-controls">
          <button 
            className="iot-control-btn iot-minimize-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Maximizar' : 'Minimizar'}
          >
            {isMinimized ? '📤' : '📥'}
          </button>
          {onClose && (
            <button 
              className="iot-control-btn iot-close-btn"
              onClick={onClose}
              title="Cerrar panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Contenido del panel (solo visible si no está minimizado) */}
      {!isMinimized && (
        <div className="iot-panel-content">
          <p className="iot-panel-description">
            Genera reportes profesionales con análisis IA, gráficos interactivos y recomendaciones.
          </p>

          {error && (
            <div className="iot-error-message">
              <span className="iot-error-icon">⚠️</span>
              {error}
              <button onClick={() => setError(null)} className="iot-error-dismiss">✕</button>
            </div>
          )}

          {/* Navegación de secciones */}
          <div className="iot-section-tabs">
            <button 
              className={`iot-section-tab ${activeSection === 'generate' ? 'active' : ''}`}
              onClick={() => setActiveSection('generate')}
            >
              📊 Generar
            </button>
            <button 
              className={`iot-section-tab ${activeSection === 'custom' ? 'active' : ''}`}
              onClick={() => setActiveSection('custom')}
            >
              🎯 Personalizado
            </button>
            <button 
              className={`iot-section-tab ${activeSection === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveSection('manage')}
            >
              📁 Gestionar ({availableReports.length})
            </button>
          </div>

          {/* Generar Reportes */}
          {activeSection === 'generate' && (
            <div className="iot-generate-section">
              <h4>Generación de Reportes</h4>
              
              {/* Configuración global */}
              <div className="iot-global-config">
                <h5>⚙️ Configuración</h5>
                <div className="iot-config-row">
                  <label>Período de análisis:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="iot-period-select"
                  >
                    <option value="hora">Última hora</option>
                    <option value="dia">Último día</option>
                    <option value="semana">Última semana</option>
                    <option value="mes">Último mes</option>
                    <option value="trimestre">Último trimestre</option>
                  </select>
                </div>
              </div>

              {/* Suite completa */}
              <div className="iot-complete-suite-section">
                <h5>🎁 Suite Completa</h5>
                <p>Genera todos los tipos de reportes de una vez.</p>
                <button 
                  onClick={generateCompleteSuite}
                  className="iot-generate-suite-btn"
                  disabled={isLoading || generatingMultiple}
                >
                  {generatingMultiple ? '🔄 Generando...' : '🚀 Generar Suite'}
                </button>
              </div>

              {/* Reportes individuales */}
              <div className="iot-individual-reports-section">
                <h5>📊 Reportes Individuales</h5>
                <div className="iot-reports-grid">
                  <div className="iot-report-card">
                    <div className="iot-report-card-header">
                      <span className="iot-report-card-icon">📊</span>
                      <h6>Ejecutivo</h6>
                    </div>
                    <p>Dashboard ejecutivo con KPIs clave y recomendaciones estratégicas.</p>
                    <button 
                      onClick={() => generateSingleReport('ejecutivo', selectedPeriod)}
                      className="iot-generate-btn"
                      disabled={isLoading}
                    >
                      Generar
                    </button>
                  </div>

                  <div className="iot-report-card">
                    <div className="iot-report-card-header">
                      <span className="iot-report-card-icon">🌡️</span>
                      <h6>Ambiental</h6>
                    </div>
                    <p>Análisis de condiciones ambientales, temperatura y humedad.</p>
                    <button 
                      onClick={() => generateSingleReport('ambiental', selectedPeriod)}
                      className="iot-generate-btn"
                      disabled={isLoading}
                    >
                      Generar
                    </button>
                  </div>

                  <div className="iot-report-card">
                    <div className="iot-report-card-header">
                      <span className="iot-report-card-icon">🔧</span>
                      <h6>Mantenimiento</h6>
                    </div>
                    <p>Predicciones de mantenimiento preventivo y estado de sensores.</p>
                    <button 
                      onClick={() => generateSingleReport('mantenimiento', selectedPeriod)}
                      className="iot-generate-btn"
                      disabled={isLoading}
                    >
                      Generar
                    </button>
                  </div>

                  <div className="iot-report-card">
                    <div className="iot-report-card-header">
                      <span className="iot-report-card-icon">⚡</span>
                      <h6>Eficiencia</h6>
                    </div>
                    <p>Análisis de eficiencia energética y optimización.</p>
                    <button 
                      onClick={() => generateSingleReport('eficiencia', selectedPeriod)}
                      className="iot-generate-btn"
                      disabled={isLoading}
                    >
                      Generar
                    </button>
                  </div>

                  <div className="iot-report-card">
                    <div className="iot-report-card-header">
                      <span className="iot-report-card-icon">🚨</span>
                      <h6>Anomalías</h6>
                    </div>
                    <p>Detección de patrones anómalos y acciones correctivas.</p>
                    <button 
                      onClick={() => generateSingleReport('anomalias', selectedPeriod)}
                      className="iot-generate-btn"
                      disabled={isLoading}
                    >
                      Generar
                    </button>
                  </div>

                  <div className="iot-report-card">
                    <div className="iot-report-card-header">
                      <span className="iot-report-card-icon">😊</span>
                      <h6>Confort</h6>
                    </div>
                    <p>Evaluación de condiciones de confort para ocupantes.</p>
                    <button 
                      onClick={() => generateSingleReport('confort', selectedPeriod)}
                      className="iot-generate-btn"
                      disabled={isLoading}
                    >
                      Generar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reporte Personalizado */}
          {activeSection === 'custom' && (
            <div className="iot-custom-section">
              <h4>🎯 Reporte Personalizado con IA</h4>
              <p>Genera un reporte específico basado en tu consulta.</p>
              
              <div className="iot-custom-examples">
                <h5>💡 Ejemplos de consultas:</h5>
                <div className="iot-examples-grid">
                  <div className="iot-example-card" onClick={() => setCustomQuery("Analiza la correlación entre temperatura y ocupación durante las horas pico de trabajo")}>
                    <strong>Análisis de Correlación</strong>
                    <p>"Analiza la correlación entre temperatura y ocupación durante las horas pico"</p>
                  </div>
                  <div className="iot-example-card" onClick={() => setCustomQuery("Evalúa el rendimiento de los sensores de temperatura en los últimos 30 días e identifica cuáles necesitan calibración")}>
                    <strong>Rendimiento de Sensores</strong>
                    <p>"Evalúa el rendimiento de los sensores e identifica cuáles necesitan calibración"</p>
                  </div>
                  <div className="iot-example-card" onClick={() => setCustomQuery("Compara las condiciones ambientales entre diferentes plantas del edificio y recomienda optimizaciones")}>
                    <strong>Comparativa por Plantas</strong>
                    <p>"Compara condiciones ambientales entre plantas y recomienda optimizaciones"</p>
                  </div>
                  <div className="iot-example-card" onClick={() => setCustomQuery("Identifica patrones de consumo energético anómalos y sugiere estrategias de ahorro")}>
                    <strong>Patrones Energéticos</strong>
                    <p>"Identifica patrones energéticos anómalos y sugiere estrategias de ahorro"</p>
                  </div>
                </div>
              </div>
              
              <div className="iot-custom-input-section">
                <div className="iot-config-row">
                  <label>Período de análisis:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="iot-period-select"
                  >
                    <option value="dia">Último día</option>
                    <option value="semana">Última semana</option>
                    <option value="mes">Último mes</option>
                    <option value="trimestre">Último trimestre</option>
                  </select>
                </div>
                
                <textarea
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Describe específicamente qué quieres analizar en tu reporte..."
                  className="iot-custom-query-textarea"
                  rows={4}
                  disabled={isLoading}
                />
                
                <button 
                  onClick={generateCustomReport}
                  className="iot-generate-custom-btn"
                  disabled={isLoading || !customQuery.trim()}
                >
                  {isLoading ? '🔄 Generando con IA...' : '🤖 Generar Reporte Personalizado'}
                </button>
              </div>
            </div>
          )}

          {/* Gestionar Reportes */}
          {activeSection === 'manage' && (
            <div className="iot-manage-section">
              <h4>📁 Gestión de Reportes</h4>
              
              <div className="iot-manage-header">
                <div className="iot-reports-summary">
                  <span className="iot-summary-item">
                    📊 {availableReports.length} reportes
                  </span>
                  <span className="iot-summary-item">
                    💾 {availableReports.reduce((total, report) => total + (report.tamaño || 0), 0) > 0 
                        ? formatFileSize(availableReports.reduce((total, report) => total + (report.tamaño || 0), 0))
                        : '0 KB'} total
                  </span>
                </div>
                
                <div className="iot-manage-actions">
                  <button 
                    onClick={loadAvailableReports}
                    className="iot-refresh-btn"
                    disabled={loadingReports}
                  >
                    {loadingReports ? '🔄' : '🔄'}
                  </button>
                  <button 
                    onClick={cleanOldReports}
                    className="iot-clean-btn"
                    disabled={isLoading}
                  >
                    🧹
                  </button>
                </div>
              </div>

              {loadingReports ? (
                <div className="iot-loading-status">
                  <div className="iot-spinner"></div>
                  <p>Cargando reportes...</p>
                </div>
              ) : availableReports.length > 0 ? (
                <div className="iot-reports-table">
                  <div className="iot-table-header">
                    <span className="iot-col-icon">Tipo</span>
                    <span className="iot-col-name">Archivo</span>
                    <span className="iot-col-date">Fecha</span>
                    <span className="iot-col-actions">Acciones</span>
                  </div>
                  
                  {availableReports.map((report, index) => (
                    <div key={index} className="iot-table-row">
                      <span className="iot-col-icon">
                        {getReportIcon(report.tipo)}
                      </span>
                      <span className="iot-col-name" title={report.fileName}>
                        {report.fileName.length > 25 
                          ? `${report.fileName.substring(0, 25)}...` 
                          : report.fileName}
                      </span>
                      <span className="iot-col-date">
                        {formatDate(report.fechaGeneracion)}
                      </span>
                      <span className="iot-col-actions">
                        <button 
                          onClick={() => window.open(report.previewUrl, '_blank')}
                          className="iot-action-btn iot-view-btn"
                          title="Ver reporte"
                        >
                          👁️
                        </button>
                        <button 
                          onClick={() => window.open(report.downloadUrl, '_blank')}
                          className="iot-action-btn iot-download-btn"
                          title="Descargar"
                        >
                          📥
                        </button>
                        <button 
                          onClick={() => deleteReport(report.fileName)}
                          className="iot-action-btn iot-delete-btn"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="iot-no-reports">
                  <div className="iot-no-reports-icon">📄</div>
                  <h5>No hay reportes disponibles</h5>
                  <p>Genera tu primer reporte.</p>
                  <button 
                    onClick={() => setActiveSection('generate')}
                    className="iot-go-generate-btn"
                  >
                    📊 Generar Reportes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {(isLoading || generatingMultiple) && (
        <div className="iot-loading-overlay">
          <div className="iot-loading-spinner">
            <div className="iot-spinner"></div>
            <p>
              {generatingMultiple 
                ? 'Generando suite completa...' 
                : 'Procesando reporte con IA...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IoTReportsTab;