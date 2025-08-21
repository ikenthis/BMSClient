import React, { useState } from 'react';
import { FormattedItemData } from './typeDefs';
import { Search, ListFilter } from 'lucide-react';

interface ElementPropertiesPanelProps {
  selectedItemData: FormattedItemData | null;
}

/**
 * Panel para mostrar propiedades y atributos del elemento seleccionado en el toolbar
 */
const ElementPropertiesPanel: React.FC<ElementPropertiesPanelProps> = ({ 
  selectedItemData 
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'attributes'>('properties');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Si no hay elemento seleccionado, mostrar mensaje
  if (!selectedItemData) {
    return (
      <div className="properties-content">
        <p className="properties-message">Seleccione un elemento para ver sus propiedades</p>
      </div>
    );
  }
  
  // Extraer propiedades básicas (atributos)
  const attributes = {
    'ID': selectedItemData.expressId,
    'Tipo': selectedItemData.type,
    'Nombre': selectedItemData.name,
    'Modelo ID': selectedItemData.modelId,
  };
  
  // Filtrar property sets según término de búsqueda
  const filteredPropertySets = searchTerm 
    ? selectedItemData.propertysets.filter(pset => 
        pset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.entries(pset.properties).some(([key, value]) => 
          key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : selectedItemData.propertysets;

  return (
    <div className="element-properties-panel">
      {/* Tabs para alternar entre PropertySets y Atributos */}
      <div className="data-tabs">
        <button 
          className={`data-tab ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('properties')}
        >
          PropertySets
        </button>
        <button 
          className={`data-tab ${activeTab === 'attributes' ? 'active' : ''}`}
          onClick={() => setActiveTab('attributes')}
        >
          Atributos
        </button>
      </div>
      
      {/* Contenido según la pestaña activa */}
      {activeTab === 'properties' && (
        <div className="property-sets-panel">
          {/* Buscador de propiedades */}
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Buscar propiedades..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} className="search-icon" />
          </div>
          
          {/* Mensaje si no hay resultados */}
          {filteredPropertySets.length === 0 && (
            <div className="no-results">
              No se encontraron propiedades con ese término de búsqueda
            </div>
          )}
          
          {/* Lista de property sets */}
          <div className="property-set-accordion">
            {filteredPropertySets.map((pset, index) => (
              <div key={`${pset.name}-${index}`} className="property-set-item">
                <div className="property-set-header">
                  <span>{pset.name}</span>
                  <ListFilter size={16} />
                </div>
                <div className="property-set-content">
                  <table className="property-table">
                    <tbody>
                      {Object.entries(pset.properties).map(([key, value]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td>{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Panel de atributos */}
      {activeTab === 'attributes' && (
        <div className="attributes-panel">
          <table className="property-table">
            <tbody>
              {Object.entries(attributes).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ElementPropertiesPanel;