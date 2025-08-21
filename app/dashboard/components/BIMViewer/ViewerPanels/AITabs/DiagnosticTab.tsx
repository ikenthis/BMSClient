// AITabs/DiagnosticTab.tsx
import React from 'react';

interface DiagnosticTabProps {
  selectedElement?: any;
  modelData?: any;
  elementsData?: any;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveTab: (tab: string) => void;
  hasModelData: boolean;
  onReloadModelData?: () => Promise<void>;
}

// Componente de diagnóstico de datos del modelo
const ModelDataDiagnostic: React.FC<{
  elementsData: any;
  onReloadRequest?: () => void;
}> = ({ elementsData, onReloadRequest }) => {
  const hasElementData = elementsData && 
    elementsData.elementTypes && 
    elementsData.elementTypes.length > 0;

  return (
    <div className="model-data-diagnostic">
      <h4>Diagnóstico de datos del modelo</h4>
      
      {hasElementData ? (
        <div className="diagnostic-info success">
          <div className="diagnostic-icon">✅</div>
          <div className="diagnostic-content">
            <p><strong>Datos disponibles:</strong> {elementsData.totalElements} elementos en total</p>
            <p><strong>Categorías:</strong> {elementsData.elementTypes.length} tipos de elementos</p>
            
            {/* Mostrar los conteos de tipos principales */}
            {elementsData.elementCounts && (
              <div className="element-counts">
                <p><strong>Elementos por tipo:</strong></p>
                <ul>
                  {Object.entries(elementsData.elementCounts)
                    .sort(([, countA], [, countB]) => Number(countB) - Number(countA))
                    .slice(0, 5)
                    .map(([type, count]) => (
                      <li key={type}>{type}: {count}</li>
                    ))
                  }
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="diagnostic-info error">
          <div className="diagnostic-icon">⚠️</div>
          <div className="diagnostic-content">
            <p><strong>No hay datos de elementos disponibles</strong></p>
            <p>El asistente no puede proporcionar información sobre elementos
               porque no se han cargado correctamente los datos del modelo.</p>
            
            {onReloadRequest && (
              <button 
                className="reload-button"
                onClick={onReloadRequest}
              >
                Recargar datos del modelo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DiagnosticTab: React.FC<DiagnosticTabProps> = ({
  elementsData,
  onReloadModelData
}) => {
  return (
    <div className="diagnostic-tab">
      <h3>Diagnóstico de conexión con el modelo BIM</h3>
      <p>Esta herramienta ayuda a diagnosticar problemas con la conexión entre el asistente IA y los datos del modelo BIM.</p>
      
      <ModelDataDiagnostic 
        elementsData={elementsData}
        onReloadRequest={onReloadModelData}
      />
      
      <div className="manual-reload-section">
        <h4>Acciones de diagnóstico</h4>
        <p>Si el asistente no está respondiendo correctamente a preguntas sobre elementos del modelo, prueba estas acciones:</p>
        <ol>
          <li>Asegúrate de que el modelo BIM esté cargado correctamente</li>
          <li>Recarga los datos del modelo usando el botón a continuación</li>
          <li>Interactúa con el modelo (selecciona elementos) para activar los eventos</li>
          <li>Cierra y vuelve a abrir el panel del asistente</li>
        </ol>
        
        <button 
          className="reload-button"
          onClick={onReloadModelData}
          disabled={!onReloadModelData}
        >
          Recargar datos del modelo
        </button>
      </div>
    </div>
  );
};

export default DiagnosticTab;