// PropertyPanel.tsx

"use client";

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import '../styles/propertypanel.css';
import FacilityPanel from './FacilityPanel'; // Importamos nuestro nuevo componente

interface PropertyPanelProps {
  selectedItemData: any;
  onClose: () => void;
  formattedPsets?: Record<string, Record<string, any>>;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ 
  selectedItemData, 
  onClose,
  formattedPsets
}) => {
  const [activeTab, setActiveTab] = useState('atributos');
  const [expandedPsets, setExpandedPsets] = useState<Record<string, boolean>>({});
  
  // Extraer atributos básicos del elemento
  const getName = () => {
    return selectedItemData?.Name?.value || 'Elemento sin nombre';
  };
  
  const getType = () => {
    return selectedItemData?.ObjectType?.value || 
           selectedItemData?.PredefinedType?.value || 
           'Tipo desconocido';
  };
  
  const getBasicAttributes = () => {
    // Extraer la categoría del elemento IFC (normalmente viene en el tipo de objeto)
    const ifcType = selectedItemData?.ObjectType?.value || selectedItemData?.OverallHeight?.type || selectedItemData?.type || '';
    
    // Obtener la categoría en formato más amigable
    let category = '';
    if (ifcType) {
      // Si el tipo comienza con "IFC", convertirlo a un formato más legible
      if (ifcType.startsWith('IFC')) {
        // Convertir IFCWALL a "Muros", IFCDOOR a "Puertas", etc.
        const categoryMap: Record<string, string> = {
          "IFCWALL": "Muros",
          "IFCSLAB": "Suelos/Losas",
          "IFCBEAM": "Vigas",
          "IFCCOLUMN": "Columnas/Pilares",
          "IFCDOOR": "Puertas",
          "IFCWINDOW": "Ventanas",
          "IFCROOF": "Techos",
          "IFCSTAIR": "Escaleras",
          "IFCRAILING": "Barandillas",
          "IFCFURNISHINGELEMENT": "Mobiliario",
          "IFCCURTAINWALL": "Muros Cortina",
          "IFCPLATE": "Placas",
          "IFCMEMBER": "Elementos Estructurales",
          "IFCBUILDINGELEMENTPROXY": "Elementos Genéricos",
          "IFCFLOWFITTING": "Conexiones MEP",
          "IFCFLOWSEGMENT": "Conductos/Tuberías",
          "IFCFLOWTERMINAL": "Terminales MEP",
          "IFCBUILDING": "Edificio",
          "IFCSPACE": "Espacios",
          "IFCSITE": "Terreno"
        };
        
        category = categoryMap[ifcType] || ifcType;
      } else {
        category = ifcType;
      }
    } else {
      category = 'No disponible';
    }
    
    // Obtener el tipo del elemento (puede estar en PredefinedType o inferirse de otros atributos)
    const elementType = selectedItemData?.PredefinedType?.value || 
                        selectedItemData?.ObjectType?.value || 
                        'Tipo estándar';
    
    // Obtener el nombre completo (combinación de nombre y tipo si están disponibles)
    const getName = () => {
      const name = selectedItemData?.Name?.value || '';
      return name || `Elemento ${selectedItemData?.GlobalId?.value || ''}`;
    };
    
    const getType = () => {
      const name = getName();
      return name ? `${name} (${elementType})` : elementType;
    };
    
    const attributes = [
      { name: 'Categoría:', value: category },
      { name: 'Tipo:', value: elementType },
      { name: 'Nombre y tipo:', value: getType() },
      { name: 'ID Global:', value: selectedItemData?.GlobalId?.value || 'No disponible' }
    ];
    
    return attributes;
  };
  
  // Alternar estado de expansión de un pset
  const togglePsetExpansion = (psetName: string) => {
    setExpandedPsets(prev => ({
      ...prev,
      [psetName]: !prev[psetName]
    }));
  };
  
  // Preparar datos del elemento para el FacilityPanel
  // Función mejorada para PropertyPanel.tsx
  // PropertyPanel.tsx - función adaptada para extraer el GUID como lo haces en ElementInfoPanel

  const getElementData = () => {
    console.log("DATOS COMPLETOS DEL ELEMENTO:", selectedItemData);
    
    // Extraer GUID principalmente del campo _guid
    let elementUuid = '';
    
    // Priorizar _guid.value que aparece en tus datos
    if (selectedItemData?._guid?.value) {
      elementUuid = selectedItemData._guid.value;
      console.log("GUID extraído de _guid.value:", elementUuid);
    }
    // Respaldos si no está _guid
    else if (selectedItemData?.GlobalId?.value) {
      elementUuid = selectedItemData.GlobalId.value;
      console.log("GUID extraído de GlobalId.value:", elementUuid);
    }
    else if (selectedItemData?.elementUuid) {
      elementUuid = selectedItemData.elementUuid;
      console.log("GUID extraído de elementUuid:", elementUuid);
    }
    
    // Extraer también el nombre si está disponible para mostrar en inicialización
    let elementName = '';
    if (selectedItemData?.Name?.value) {
      elementName = selectedItemData.Name.value;
      console.log("Nombre extraído:", elementName);
    }
    
    // Extraer tipo si está disponible
    let elementType = '';
    if (selectedItemData?.ObjectType?.value) {
      elementType = selectedItemData.ObjectType.value;
      console.log("Tipo extraído:", elementType);
    }
    
    // Extraer categoría si está disponible
    let category = '';
    if (selectedItemData?._category?.value) {
      category = selectedItemData._category.value;
      console.log("Categoría extraída:", category);
    }
    
    // Resultado final con GUID y datos adicionales
    const result = {
      elementUuid,
      elementName,
      elementType,
      category,
      originalData: selectedItemData
    };
    
    console.log("GUID FINAL A UTILIZAR:", elementUuid);
    
    return result;
  };
  
  // Verificar si tenemos psets formateados
  const hasPsets = formattedPsets && Object.keys(formattedPsets).length > 0;
  
  // Lista de psets para mostrar
  const psetNames = hasPsets ? Object.keys(formattedPsets!) : [];

  return (
    <div className="property-panel">
      {/* Header */}
      <div className="property-panel-header">
        <div className="property-panel-title">
          <h3>{getName()}</h3>
          <p>{getType()}</p>
        </div>
        <button 
          onClick={onClose} 
          className="property-panel-close"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Tabs */}
      <div className="property-panel-tabs">
        <button 
          className={`property-panel-tab ${activeTab === 'atributos' ? 'active' : ''}`}
          onClick={() => setActiveTab('atributos')}
        >
          Atributos
        </button>
        <button 
          className={`property-panel-tab ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('properties')}
        >
          Properties
        </button>
        <button 
          className={`property-panel-tab ${activeTab === 'facility' ? 'active' : ''}`}
          onClick={() => setActiveTab('facility')}
        >
          Facility
        </button>
      </div>
      
      {/* Content */}
      <div className="property-panel-content">
        {/* Atributos básicos */}
        {activeTab === 'atributos' && (
          <div className="property-section">
            <div className="attributes-list">
              {getBasicAttributes().map((attr, index) => (
                <div key={index} className="property-item">
                  <span className="property-name">{attr.name}</span>
                  <span className="property-value">{attr.value}</span>
                </div>
              ))}
            </div>
            
            {/* Sección de restricciones */}
            <div className="collapsible-section">
              <button 
                className="collapsible-header"
                onClick={() => {
                  setExpandedPsets(prev => ({
                    ...prev,
                    restrictions: !prev.restrictions
                  }));
                }}
              >
                <span>Restricciones</span>
                {expandedPsets.restrictions !== false ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              
              {expandedPsets.restrictions !== false && (
                <div className="collapsible-content">
                  <div className="property-item">
                    <span className="property-name">Desfase de base:</span>
                    <span className="property-value">0</span>
                  </div>
                  <div className="property-item">
                    <span className="property-name">Delimitación de habitación:</span>
                    <span className="property-value">true</span>
                  </div>
                  <div className="property-item">
                    <span className="property-name">Relacionado con masa:</span>
                    <span className="property-value">false</span>
                  </div>
                  <div className="property-item">
                    <span className="property-name">Desfase superior:</span>
                    <span className="property-value">0</span>
                  </div>
                  <div className="property-item">
                    <span className="property-name">La base está enlazada:</span>
                    <span className="property-value">false</span>
                  </div>
                  <div className="property-item">
                    <span className="property-name">La parte superior está enlazada:</span>
                    <span className="property-value">false</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Property Sets */}
        {activeTab === 'properties' && (
          <div className="property-section">
            {hasPsets ? (
              <div>
                {psetNames.map((psetName) => {
                  const isExpanded = expandedPsets[psetName] !== false; // Por defecto expandido
                  const properties = formattedPsets![psetName];
                  
                  return (
                    <div key={psetName} className="pset-item">
                      <div 
                        className="pset-header"
                        onClick={() => togglePsetExpansion(psetName)}
                      >
                        <h4 className="pset-title">{psetName}</h4>
                        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                      
                      {isExpanded && (
                        <div className="pset-content">
                          {Object.entries(properties).map(([propName, propValue]) => (
                            <div key={propName} className="property-item">
                              <span className="property-name">{propName}:</span>
                              <span className="property-value">{String(propValue)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-message">
                <p>No se encontraron property sets para este elemento.</p>
              </div>
            )}
          </div>
        )}
        
        {/* Facility - Utilizamos nuestro componente FacilityPanel */}
        {activeTab === 'facility' && (
        <FacilityPanel elementData={getElementData()} />
      )}
      </div>
    </div>
  );
};

export default PropertyPanel;