"use client";
// DataPanel.tsx - Panel for displaying element data
import React from 'react';
import * as FRAGS from '@thatopen/fragments';
import { Icons } from '../UI/ViewerIcons';
import styles from '../styles/viewer.module.css';

interface DataPanelProps {
  showDataPanel: boolean;
  activeDataFunction: string | null;
  dataPanelContent: any;
  selectedItem: FRAGS.ItemData | null;
  onClose: () => void;
}

export const DataPanel: React.FC<DataPanelProps> = ({
  showDataPanel,
  activeDataFunction,
  dataPanelContent,
  selectedItem,
  onClose
}) => {
  // Render attributes content
  const renderAttributes = () => {
    if (!dataPanelContent) return null;
    
    return Object.entries(dataPanelContent).map(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return null; // Skip complex objects that should be handled by getItemPropertySets
      }
      
      const displayValue = typeof value === 'object' && value !== null && 'value' in value 
        ? value.value 
        : String(value);
      
      return (
        <div key={key} className={styles.attributeItem}>
          <div className={styles.attributeName}>{key}</div>
          <div className={styles.attributeValue}>{displayValue}</div>
        </div>
      );
    });
  };

  // Render property sets content
  const renderPropertySets = () => {
    if (!dataPanelContent) return null;
    
    return Object.entries(dataPanelContent).map(([psetName, properties]: [string, any], index) => (
      <div key={psetName} className={styles.propertySet}>
        <div className={`${styles.propertySetHeader} ${index % 2 === 0 ? styles.propertySetHeaderAlt : ''}`}>
          {psetName}
        </div>
        <div className={styles.propertySetContent}>
          {Object.entries(properties).map(([propName, propValue]: [string, any]) => (
            <div key={propName} className={styles.propertyItem}>
              <div className={styles.propertyName}>{propName}</div>
              <div className={styles.propertyValue}>{String(propValue)}</div>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div 
      className={styles.dataPanel}
      style={{
        transform: showDataPanel ? 'translateX(0)' : 'translateX(420px)',
        opacity: showDataPanel ? 1 : 0,
        pointerEvents: showDataPanel ? 'all' : 'none'
      }}
    >
      {/* Panel Header */}
      <div className={styles.dataPanelHeader}>
        <div className={styles.dataPanelHeaderContent}>
          <div className={styles.dataPanelIcon}>
            {activeDataFunction === 'getAttributes' ? <Icons.attributes /> : <Icons.properties />}
          </div>
          <div>
            <h3 className={styles.dataPanelTitle}>
              <span className={styles.dataPanelId}>
                {selectedItem?.expressID}
              </span>
              <span className={styles.dataPanelType}>
                {activeDataFunction === 'getAttributes' ? 'Attributes' : 'Property Sets'}
              </span>
            </h3>
            {selectedItem?.Name?.value && (
              <p className={styles.dataPanelSubtitle}>
                {selectedItem.Name.value}
              </p>
            )}
          </div>
        </div>
        <button 
          className={styles.dataPanelCloseButton}
          onClick={onClose}
        >
          <Icons.close />
        </button>
      </div>

      {/* Panel Content */}
      <div className={styles.dataPanelContent}>
        {typeof dataPanelContent === 'string' ? (
          <div className={styles.dataPanelMessage}>
            {dataPanelContent}
          </div>
        ) : dataPanelContent === null ? (
          <div className={styles.dataPanelPlaceholder}>
            Select an element to view data
          </div>
        ) : activeDataFunction === 'getAttributes' ? (
          renderAttributes()
        ) : activeDataFunction === 'getItemPropertySets' ? (
          renderPropertySets()
        ) : (
          <div className={styles.dataPanelMessage}>
            Unknown data type
          </div>
        )}
      </div>
    </div>
  );
};