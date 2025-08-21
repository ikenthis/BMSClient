// BIMIntelligence.tsx
import React, { useState, useEffect } from 'react';
import '../styles/BIMIntelligence.css'; // Asegúrate de crear este archivo CSS
import { Message } from '../services/aiAssistantService'; // Asegúrate de que la ruta sea correcta

interface BIMIntelligenceProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedElement: any;
  elementsData: any;
  aiAgent: any;
  onActionExecuted: (action: string, result: any) => void;
  setMessages: (updater: (prev: Message[]) => Message[]) => void;
  setActiveTab: (tab: string) => void;
}

const BIMIntelligence: React.FC<BIMIntelligenceProps> = ({
  isLoading,
  setIsLoading,
  selectedElement,
  elementsData,
  aiAgent,
  onActionExecuted,
  setMessages,
  setActiveTab
}) => {
  const [bimQueryInput, setBimQueryInput] = useState<string>('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'elements' | 'spaces' | 'maintenance' | 'custom'>('elements');

  // Verificar si el agente está inicializado
  const isAgentReady = aiAgent && aiAgent.isInitialized && typeof aiAgent.executeAction === 'function';

  // Función para manejar las acciones del agente
  const handleAgentAction = async (actionRequest: string, params: any = {}) => {
    if (!isAgentReady) {
      console.error("Agente no inicializado o no tiene el método executeAction");
      return;
    }

    try {
      setIsLoading(true);
      setLastAction(actionRequest);
      
      // Crear mensaje de usuario para mostrar en el chat
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Solicitud BIM: ${actionRequest}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Ejecutar la acción en el agente
      const result = await aiAgent.executeAction(actionRequest, {
        elementData: selectedElement,
        modelData: elementsData
      });
      
      // Notificar que la acción se ha completado
      onActionExecuted(actionRequest, result);
      
      // Cambiar a pestaña de chat para mostrar el resultado
      setActiveTab('chat');
      
      return result;
    } catch (error: any) {
      console.error(`Error al ejecutar acción "${actionRequest}":`, error);
      
      // Mostrar mensaje de error
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: `❌ Error al realizar la acción: ${error.message || 'Error desconocido'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setActiveTab('chat');
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para ejecutar una consulta de texto libre
  const handleTextQuery = async () => {
    if (!bimQueryInput.trim() || isLoading) return;
    
    try {
      // Ejecutar la consulta directamente
      await handleAgentAction(bimQueryInput);
      
      // Limpiar el input
      setBimQueryInput('');
    } catch (error) {
      console.error("Error en consulta de texto libre:", error);
    }
  };

  // Manejadores para cada tipo de análisis
  const handleElementsAnalysis = async () => {
    try {
      const actionRequest = "Analiza la distribución de elementos en el modelo y muestra un resumen de los tipos más frecuentes";
      await handleAgentAction(actionRequest);
    } catch (error) {
      console.error("Error en análisis de elementos:", error);
    }
  };

  const handleSpacesAnalysis = async () => {
    try {
      const actionRequest = "Encuentra y analiza todos los espacios (IFCSPACE) en el modelo, mostrando sus características principales";
      await handleAgentAction(actionRequest);
    } catch (error) {
      console.error("Error en análisis de espacios:", error);
    }
  };

  const handleMaintenanceAnalysis = async () => {
    try {
      const actionRequest = "Genera un reporte de mantenimiento para los elementos del modelo";
      await handleAgentAction(actionRequest);
    } catch (error) {
      console.error("Error en análisis de mantenimiento:", error);
    }
  };

  const handleElementDetail = async () => {
    if (!selectedElement) return;
    
    try {
      const elementId = selectedElement.id || selectedElement.elementUuid || selectedElement.localId;
      const actionRequest = `Analiza en detalle el elemento con ID ${elementId}`;
      await handleAgentAction(actionRequest);
    } catch (error) {
      console.error("Error en análisis de elemento:", error);
    }
  };

  const handleElementZoom = async () => {
    if (!selectedElement) return;
    
    try {
      const elementId = selectedElement.id || selectedElement.elementUuid || selectedElement.localId;
      const actionRequest = `Haz zoom al elemento con ID ${elementId}`;
      await handleAgentAction(actionRequest);
    } catch (error) {
      console.error("Error al hacer zoom al elemento:", error);
    }
  };

  const handleFindSimilar = async () => {
    if (!selectedElement) return;
    
    try {
      const elementType = selectedElement.elementType || selectedElement.type;
      const actionRequest = `Encuentra todos los elementos de tipo ${elementType} y resáltalos en el modelo`;
      await handleAgentAction(actionRequest);
    } catch (error) {
      console.error("Error al buscar elementos similares:", error);
    }
  };

  const handleCreateVisualDiagram = async () => {
    try {
      const actionRequest = "Crea un diagrama visual 3D que muestre la distribución de elementos por tipo";
      await handleAgentAction(actionRequest);
    } catch (error) {
      console.error("Error al crear diagrama visual:", error);
    }
  };

  // Función auxiliar para obtener el icono según el tipo de elemento
  const getElementIcon = (elementType: string = '') => {
    const type = elementType.toUpperCase();
    
    if (type.includes('WALL') || type === 'IFCWALL') return '🧱';
    if (type.includes('DOOR') || type === 'IFCDOOR') return '🚪';
    if (type.includes('WINDOW') || type === 'IFCWINDOW') return '🪟';
    if (type.includes('SPACE') || type === 'IFCSPACE') return '🏠';
    if (type.includes('STAIR') || type === 'IFCSTAIR') return '🪜';
    if (type.includes('COLUMN') || type === 'IFCCOLUMN') return '🏛️';
    if (type.includes('BEAM') || type === 'IFCBEAM') return '➖';
    if (type.includes('ROOF') || type === 'IFCROOF') return '🏠';
    if (type.includes('FURNIT') || type === 'IFCFURNITUREELEMENT') return '🪑';
    if (type.includes('SLAB') || type === 'IFCSLAB') return '⬜';
    
    // Default icon
    return '📦';
  };

  return (
    <div className="bim-intelligence-container">
      <h3>BIM Intelligence - Análisis Inteligente de Modelos</h3>
      <p className="bim-description">
        Analiza y extrae insights valiosos del modelo BIM usando inteligencia artificial para optimizar gestión, mantenimiento y toma de decisiones.
      </p>

      {!isAgentReady && (
        <div className="agent-warning">
          <p>⚠️ El agente de IA no está inicializado correctamente. Espera a que el modelo se cargue completamente.</p>
        </div>
      )}

      <div className="analysis-type-selector">
        <div className="selector-tabs">
          <button 
            className={`selector-tab ${analysisType === 'elements' ? 'active' : ''}`}
            onClick={() => setAnalysisType('elements')}
          >
            <span className="tab-icon">📊</span> Elementos
          </button>
          <button 
            className={`selector-tab ${analysisType === 'spaces' ? 'active' : ''}`}
            onClick={() => setAnalysisType('spaces')}
          >
            <span className="tab-icon">🏠</span> Espacios
          </button>
          <button 
            className={`selector-tab ${analysisType === 'maintenance' ? 'active' : ''}`}
            onClick={() => setAnalysisType('maintenance')}
          >
            <span className="tab-icon">🔧</span> Mantenimiento
          </button>
          <button 
            className={`selector-tab ${analysisType === 'custom' ? 'active' : ''}`}
            onClick={() => setAnalysisType('custom')}
          >
            <span className="tab-icon">💬</span> Personalizado
          </button>
        </div>
      </div>

      <div className="analysis-content">
        {analysisType === 'elements' && (
          <div className="elements-analysis">
            <div className="action-cards">
              <div className="action-card">
                <div className="card-header">
                  <div className="card-icon">📊</div>
                  <h4>Distribución de Elementos</h4>
                </div>
                <p>Analiza la distribución y frecuencia de los diferentes tipos de elementos en el modelo BIM.</p>
                <button 
                  className="action-button"
                  onClick={handleElementsAnalysis}
                  disabled={isLoading || !isAgentReady}
                >
                  {isLoading ? 'Analizando...' : 'Analizar Elementos'}
                </button>
              </div>

              <div className="action-card">
                <div className="card-header">
                  <div className="card-icon">🔍</div>
                  <h4>Visualización Inteligente</h4>
                </div>
                <p>Crea un diagrama visual 3D que muestre la distribución de elementos por categoría.</p>
                <button 
                  className="action-button"
                  onClick={handleCreateVisualDiagram}
                  disabled={isLoading || !isAgentReady}
                >
                  {isLoading ? 'Creando...' : 'Crear Diagrama'}
                </button>
              </div>
            </div>

            {selectedElement && (
              <div className="selected-element-section">
                <h4>Elemento Seleccionado</h4>
                <div className="selected-element-card">
                  <div className="element-icon">
                    {getElementIcon(selectedElement.elementType || selectedElement.type)}
                  </div>
                  <div className="element-info">
                    <p className="element-name">{selectedElement.elementName || selectedElement.name || `Elemento ${selectedElement.id || selectedElement.elementUuid || selectedElement.localId}`}</p>
                    <p className="element-type">{selectedElement.elementType || selectedElement.type || 'Tipo desconocido'}</p>
                    {selectedElement.category && <p className="element-category">Categoría: {selectedElement.category}</p>}
                  </div>
                  <div className="element-actions">
                    <button
                      className="element-action-button analyze"
                      onClick={handleElementDetail}
                      disabled={isLoading || !isAgentReady}
                    >
                      Analizar
                    </button>
                    <button
                      className="element-action-button zoom"
                      onClick={handleElementZoom}
                      disabled={isLoading || !isAgentReady}
                    >
                      Zoom
                    </button>
                    <button
                      className="element-action-button similar"
                      onClick={handleFindSimilar}
                      disabled={isLoading || !isAgentReady}
                    >
                      Buscar Similares
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {analysisType === 'spaces' && (
          <div className="spaces-analysis">
            <div className="action-cards">
              <div className="action-card">
                <div className="card-header">
                  <div className="card-icon">🏠</div>
                  <h4>Análisis de Espacios</h4>
                </div>
                <p>Analiza los espacios definidos (IFCSPACE) en el modelo, identificando características, relaciones y potenciales optimizaciones.</p>
                <button 
                  className="action-button"
                  onClick={handleSpacesAnalysis}
                  disabled={isLoading || !isAgentReady}
                >
                  {isLoading ? 'Analizando...' : 'Analizar Espacios'}
                </button>
              </div>

              <div className="action-card">
                <div className="card-header">
                  <div className="card-icon">📐</div>
                  <h4>Optimización Espacial</h4>
                </div>
                <p>Evalúa la distribución y uso de espacios, detectando áreas de mejora para optimización del edificio.</p>
                <button 
                  className="action-button"
                  onClick={() => handleAgentAction("Analiza la eficiencia de uso de los espacios e identifica oportunidades de optimización")}
                  disabled={isLoading || !isAgentReady}
                >
                  {isLoading ? 'Analizando...' : 'Optimizar Espacios'}
                </button>
              </div>
            </div>

            <div className="space-metrics">
              <h4>Métricas de Espacios</h4>
              <p>Selecciona un espacio en el modelo para ver métricas detalladas o utiliza los análisis generales para evaluar todos los espacios.</p>
              
              <button
                className="detailed-button"
                onClick={() => handleAgentAction("Encuentra todos los espacios y analiza su distribución por área y función")}
                disabled={isLoading || !isAgentReady}
              >
                {isLoading ? 'Analizando...' : 'Análisis Detallado de Espacios'}
              </button>
            </div>
          </div>
        )}

        {analysisType === 'maintenance' && (
          <div className="maintenance-analysis">
            <div className="action-cards">
              <div className="action-card">
                <div className="card-header">
                  <div className="card-icon">📝</div>
                  <h4>Reporte de Mantenimiento</h4>
                </div>
                <p>Genera un informe detallado con recomendaciones de mantenimiento para los elementos del modelo.</p>
                <button 
                  className="action-button"
                  onClick={handleMaintenanceAnalysis}
                  disabled={isLoading || !isAgentReady}
                >
                  {isLoading ? 'Generando...' : 'Generar Reporte'}
                </button>
              </div>

              <div className="action-card">
                <div className="card-header">
                  <div className="card-icon">🔄</div>
                  <h4>Priorización de Elementos</h4>
                </div>
                <p>Identifica elementos críticos que requieren mantenimiento prioritario basado en su función y estado.</p>
                <button 
                  className="action-button"
                  onClick={() => handleAgentAction("Identifica los elementos críticos que requieren mantenimiento prioritario y márcalos en el modelo")}
                  disabled={isLoading || !isAgentReady}
                >
                  {isLoading ? 'Analizando...' : 'Identificar Prioridades'}
                </button>
              </div>
            </div>

            <div className="maintenance-calendar">
              <h4>Planificación de Mantenimiento</h4>
              <p>Genera un calendario de mantenimiento optimizado para los elementos del modelo.</p>
              
              <div className="calendar-options">
                <button
                  className="calendar-button"
                  onClick={() => handleAgentAction("Genera un calendario de mantenimiento trimestral para los elementos del modelo")}
                  disabled={isLoading || !isAgentReady}
                >
                  Trimestral
                </button>
                <button
                  className="calendar-button"
                  onClick={() => handleAgentAction("Genera un calendario de mantenimiento semestral para los elementos del modelo")}
                  disabled={isLoading || !isAgentReady}
                >
                  Semestral
                </button>
                <button
                  className="calendar-button"
                  onClick={() => handleAgentAction("Genera un calendario de mantenimiento anual para los elementos del modelo")}
                  disabled={isLoading || !isAgentReady}
                >
                  Anual
                </button>
              </div>
            </div>
          </div>
        )}

        {analysisType === 'custom' && (
          <div className="custom-query">
            <h4>Consulta Personalizada</h4>
            <p>Describe en lenguaje natural lo que quieres analizar o visualizar en el modelo BIM.</p>
            
            <div className="query-examples">
              <h5>Ejemplos de consultas:</h5>
              <ul>
                <li>"Cuenta cuántas puertas hay en el modelo"</li>
                <li>"Encuentra todos los espacios mayores a 20m² y resáltalos"</li>
                <li>"Muestra la distribución de elementos por planta"</li>
                <li>"Crea un diagrama de distribución de elementos"</li>
                <li>"Analiza la relación entre espacios y áreas funcionales"</li>
              </ul>
            </div>
            
            <div className="query-input-container">
              <textarea
                className="query-input"
                placeholder="Escribe tu consulta o instrucción (ej: 'Encuentra todas las ventanas y resáltalas en el modelo')"
                value={bimQueryInput}
                onChange={(e) => setBimQueryInput(e.target.value)}
                rows={4}
                disabled={isLoading}
              />
              <button
                className="query-submit-button"
                onClick={handleTextQuery}
                disabled={isLoading || !bimQueryInput.trim() || !isAgentReady}
              >
                {isLoading ? 'Procesando...' : 'Ejecutar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BIMIntelligence;