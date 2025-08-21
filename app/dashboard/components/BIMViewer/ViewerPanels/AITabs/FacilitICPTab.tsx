// AITabs/FacilitICPTab.tsx
import React, { useState } from 'react';
import aiFicServices from '../../services/aiFicServices';
import { Message } from '../../services/aiAssistantService';

interface FacilitICPTabProps {
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

const FacilitICPTab: React.FC<FacilitICPTabProps> = ({
  selectedElement,
  modelData,
  isLoading,
  setIsLoading,
  setError,
  messages,
  setMessages,
  setActiveTab
}) => {
  const [periodoPrediccion, setPeriodoPrediccion] = useState<'3' | '6' | '12' | '24'>('6');
  const [tipoAnalisis, setTipoAnalisis] = useState<'general' | 'consumo' | 'calendario' | 'mejoras'>('general');

  // Manejar predicción de mantenimiento con FacilitICP
  const handleFacilitIcpPrediction = async () => {
    if (!selectedElement) return;
    
    setIsLoading(true);
    
    try {
      // Mostrar mensaje de usuario
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Solicitud de análisis predictivo para ${selectedElement.elementName || selectedElement.name || selectedElement.type || 'el elemento seleccionado'} (período: ${periodoPrediccion} meses)`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Obtener análisis del servicio FacilitICP
      const response = await aiFicServices.analizarElemento(
        selectedElement.id || selectedElement.elementUuid
      );
      
      const assistantMessage: Message = {
        id: Date.now().toString() + '-prediction',
        role: 'assistant',
        content: `# Análisis predictivo FacilitICP\n\n**Elemento:** ${selectedElement.elementName || selectedElement.name || selectedElement.type || 'Elemento seleccionado'}\n**Período analizado:** ${periodoPrediccion} meses\n\n${response.data.analisis || response.data.resultado}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setActiveTab('chat'); // Cambiar a la pestaña de chat para mostrar el resultado
    } catch (err) {
      console.error('Error al generar análisis predictivo:', err);
      setError('Error al generar el análisis. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar generación de reportes con FacilitICP
  const handleGenerarReporte = async () => {
    setIsLoading(true);
    
    try {
      // Mostrar mensaje de usuario
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Solicitud de reporte de mantenimiento predictivo',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Obtener reporte del servicio FacilitICP
      const response = await aiFicServices.generarReporteMantenimiento();
      
      const assistantMessage: Message = {
        id: Date.now().toString() + '-report',
        role: 'assistant',
        content: `# Reporte de Mantenimiento Predictivo\n\n${response.data.reporte || response.data.resultado}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setActiveTab('chat'); // Cambiar a la pestaña de chat para mostrar el resultado
    } catch (err) {
      console.error('Error al generar reporte:', err);
      setError('Error al generar el reporte. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar análisis de consumo energético
  const handleAnalisisConsumo = async () => {
    setIsLoading(true);
    
    try {
      // Mostrar mensaje de usuario
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Solicitud de análisis de consumo energético',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Consulta personalizada para análisis energético
      const response = await aiFicServices.procesarConsulta(
        "Analiza el consumo energético de los equipos eléctricos y de climatización. Identifica patrones inusuales que podrían indicar fallos o ineficiencias. Recomienda ajustes para optimizar el consumo energético y reducir costos.",
        { modelInfo: modelData }
      );
      
      const assistantMessage: Message = {
        id: Date.now().toString() + '-energy',
        role: 'assistant',
        content: `# Análisis de Consumo Energético\n\n${response.data.resultado || response.data.response}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setActiveTab('chat'); // Cambiar a la pestaña de chat para mostrar el resultado
    } catch (err) {
      console.error('Error al generar análisis de consumo:', err);
      setError('Error al generar el análisis. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar generación de calendario de mantenimiento
  const handleGenerarCalendario = async () => {
    setIsLoading(true);
    
    try {
      // Mostrar mensaje de usuario
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Solicitud de calendario de mantenimiento optimizado',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Consulta personalizada para generación de calendario
      const response = await aiFicServices.procesarConsulta(
        "Genera un calendario optimizado de mantenimiento trimestral que: 1. Distribuya equitativamente las tareas para evitar sobrecarga, 2. Priorice equipos críticos y con historial de fallos, 3. Agrupe mantenimientos por ubicación para optimizar desplazamientos, 4. Considere la estacionalidad y uso de los equipos, 5. Sugiera recursos necesarios (personal, tiempo, materiales)",
        { modelInfo: modelData }
      );
      
      const assistantMessage: Message = {
        id: Date.now().toString() + '-calendar',
        role: 'assistant',
        content: `# Calendario de Mantenimiento Optimizado\n\n${response.data.resultado || response.data.response}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setActiveTab('chat'); // Cambiar a la pestaña de chat para mostrar el resultado
    } catch (err) {
      console.error('Error al generar calendario:', err);
      setError('Error al generar el calendario. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar recomendaciones de mejoras
  const handleRecomendarMejoras = async () => {
    setIsLoading(true);
    
    try {
      // Mostrar mensaje de usuario
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Solicitud de recomendaciones de mejoras para equipamiento',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Consulta personalizada para recomendaciones
      const response = await aiFicServices.procesarConsulta(
        "Basado en el historial de mantenimiento y fallos: 1. Identifica equipos que deberían ser reemplazados pronto, 2. Sugiere alternativas más eficientes para los equipos problemáticos, 3. Recomienda tecnologías para mejorar el monitoreo y mantenimiento, 4. Propone mejoras en la configuración o uso de los equipos existentes",
        { modelInfo: modelData }
      );
      
      const assistantMessage: Message = {
        id: Date.now().toString() + '-improvements',
        role: 'assistant',
        content: `# Recomendaciones de Mejoras\n\n${response.data.resultado || response.data.response}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setActiveTab('chat'); // Cambiar a la pestaña de chat para mostrar el resultado
    } catch (err) {
      console.error('Error al generar recomendaciones:', err);
      setError('Error al generar las recomendaciones. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-faciliticp">
      <h3>FacilitICP - Inteligencia Predictiva</h3>
      <p>Nuestro sistema predictivo basado en IA Claude analiza los datos de tu modelo BIM y predice necesidades de mantenimiento, optimiza recursos y detecta riesgos potenciales.</p>
      
      <div className="faciliticp-options">
        <div className="option-tabs">
          <button 
            className={`option-tab ${tipoAnalisis === 'general' ? 'active' : ''}`}
            onClick={() => setTipoAnalisis('general')}
          >
            <span className="tab-icon">🔍</span> Análisis Predictivo
          </button>
          <button 
            className={`option-tab ${tipoAnalisis === 'consumo' ? 'active' : ''}`}
            onClick={() => setTipoAnalisis('consumo')}
          >
            <span className="tab-icon">⚡</span> Consumo Energético
          </button>
          <button 
            className={`option-tab ${tipoAnalisis === 'calendario' ? 'active' : ''}`}
            onClick={() => setTipoAnalisis('calendario')}
          >
            <span className="tab-icon">📅</span> Planificación
          </button>
          <button 
            className={`option-tab ${tipoAnalisis === 'mejoras' ? 'active' : ''}`}
            onClick={() => setTipoAnalisis('mejoras')}
          >
            <span className="tab-icon">⬆️</span> Mejoras
          </button>
        </div>
        
        <div className="option-content">
          {/* Análisis Predictivo */}
          {tipoAnalisis === 'general' && (
            <div className="option-panel">
              <h4>Análisis Predictivo Avanzado</h4>
              <p>Realiza un análisis predictivo para anticipar fallos y necesidades de mantenimiento.</p>
              
              {selectedElement ? (
                <div className="element-analysis">
                  <h4>Elemento seleccionado:</h4>
                  <p className="selected-element-info">
                    <strong>{selectedElement.elementName || selectedElement.name || selectedElement.type || selectedElement.elementType || 'Elemento sin nombre'}</strong>
                    {selectedElement.category && <span> | Categoría: {selectedElement.category}</span>}
                    {selectedElement.id && <span> | ID: {selectedElement.id.substring(0, 8)}...</span>}
                  </p>
                  
                  <div className="timeframe-selector">
                    <label htmlFor="timeframe">Período de predicción:</label>
                    <select 
                      id="timeframe" 
                      className="timeframe-select"
                      value={periodoPrediccion} 
                      onChange={(e) => setPeriodoPrediccion(e.target.value as any)}
                    >
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">12 meses</option>
                      <option value="24">24 meses</option>
                    </select>
                  </div>
                  
                  <button
                    className="analyze-button"
                    onClick={handleFacilitIcpPrediction}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Analizando...' : 'Analizar y predecir fallos'}
                  </button>
                </div>
              ) : (
                <div className="no-element-selected">
                  <p>Selecciona un elemento del modelo para analizar.</p>
                  <p className="tip">Haz clic en cualquier componente del modelo 3D para seleccionarlo.</p>
                </div>
              )}
              
              <div className="generate-report">
                <h4>Reporte general de mantenimiento</h4>
                <p>Genera un reporte completo de todos los elementos del modelo</p>
                <button 
                  className="report-button"
                  onClick={handleGenerarReporte}
                  disabled={isLoading}
                >
                  {isLoading ? 'Generando...' : 'Generar reporte completo'}
                </button>
              </div>
            </div>
          )}
          
          {/* Análisis de Consumo */}
          {tipoAnalisis === 'consumo' && (
            <div className="option-panel">
              <h4>Análisis de Consumo Energético</h4>
              <p>Analiza el consumo energético de tus equipos e instalaciones para identificar ineficiencias y oportunidades de ahorro.</p>
              
              <div className="energy-analysis-info">
                <div className="info-card">
                  <div className="card-icon">⚠️</div>
                  <div className="card-content">
                    <h5>Detección de anomalías</h5>
                    <p>Identifica patrones inusuales en el consumo que podrían indicar fallos</p>
                  </div>
                </div>
                
                <div className="info-card">
                  <div className="card-icon">💰</div>
                  <div className="card-content">
                    <h5>Optimización de costos</h5>
                    <p>Recibe recomendaciones para reducir el gasto energético</p>
                  </div>
                </div>
                
                <div className="info-card">
                  <div className="card-icon">📈</div>
                  <div className="card-content">
                    <h5>Proyección futura</h5>
                    <p>Predicción de consumo basada en datos históricos y estacionalidad</p>
                  </div>
                </div>
              </div>
              
              <button
                className="analysis-button"
                onClick={handleAnalisisConsumo}
                disabled={isLoading}
              >
                {isLoading ? 'Analizando...' : 'Analizar consumo energético'}
              </button>
            </div>
          )}
          
          {/* Planificación */}
          {tipoAnalisis === 'calendario' && (
            <div className="option-panel">
              <h4>Planificación Inteligente de Mantenimiento</h4>
              <p>Genera un calendario optimizado de mantenimiento basado en predicciones de IA.</p>
              
              <div className="planning-benefits">
                <ul>
                  <li><strong>Distribución inteligente</strong> de tareas para evitar sobrecarga</li>
                  <li><strong>Priorización</strong> de equipos críticos y con historial de fallos</li>
                  <li><strong>Agrupación eficiente</strong> de mantenimientos por ubicación</li>
                  <li><strong>Consideración</strong> de estacionalidad y patrones de uso</li>
                  <li><strong>Optimización</strong> de recursos humanos y materiales</li>
                </ul>
              </div>
              
              <button
                className="calendar-button"
                onClick={handleGenerarCalendario}
                disabled={isLoading}
              >
                {isLoading ? 'Generando...' : 'Generar calendario de mantenimiento'}
              </button>
            </div>
          )}
          
          {/* Mejoras */}
          {tipoAnalisis === 'mejoras' && (
            <div className="option-panel">
              <h4>Recomendaciones de Mejoras</h4>
              <p>Obtén sugerencias inteligentes para optimizar tus equipos e instalaciones.</p>
              
              <div className="improvements-features">
                <div className="feature">
                  <div className="feature-icon">🔄</div>
                  <div className="feature-text">
                    <h5>Identificación de equipos a reemplazar</h5>
                    <p>Basado en análisis de ciclo de vida y rendimiento</p>
                  </div>
                </div>
                
                <div className="feature">
                  <div className="feature-icon">🌱</div>
                  <div className="feature-text">
                    <h5>Alternativas sostenibles</h5>
                    <p>Opciones más eficientes y con menor impacto ambiental</p>
                  </div>
                </div>
                
                <div className="feature">
                  <div className="feature-icon">📱</div>
                  <div className="feature-text">
                    <h5>Tecnologías de monitoreo</h5>
                    <p>Soluciones IoT para mantenimiento predictivo</p>
                  </div>
                </div>
                
                <div className="feature">
                  <div className="feature-icon">⚙️</div>
                  <div className="feature-text">
                    <h5>Optimización de configuración</h5>
                    <p>Ajustes en la operación para maximizar rendimiento</p>
                  </div>
                </div>
              </div>
              
              <button
                className="improvements-button"
                onClick={handleRecomendarMejoras}
                disabled={isLoading}
              >
                {isLoading ? 'Analizando...' : 'Obtener recomendaciones de mejoras'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacilitICPTab;