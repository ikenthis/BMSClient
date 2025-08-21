"use client";
// FunctionsPanel.tsx - Panel with data functions
import React from 'react';
import { Icons } from '../UI/ViewerIcons';
import styles from '../styles/viewer.module.css';
interface FunctionsPanelProps {
  showFunctionsPanel: boolean;
  activeDataFunction: string | null;
  toggleFunctionsPanel: () => void;
  toggleDataFunction: (functionName: string) => void;
  makeWallsOpaque: () => void;
}

export const FunctionsPanel: React.FC<FunctionsPanelProps> = ({
  showFunctionsPanel,
  activeDataFunction,
  toggleFunctionsPanel,
  toggleDataFunction,
  makeWallsOpaque
}) => {
  return (
    <div 
      className={styles.functionsPanel} 
      style={{
        transform: `translateX(-50%) ${showFunctionsPanel ? 'translateY(0)' : 'translateY(20px)'}`,
        opacity: showFunctionsPanel ? 1 : 0,
        pointerEvents: showFunctionsPanel ? 'all' : 'none'
      }}
    >
      <div className={styles.functionsPanelHeader}>
        <div className={styles.functionsPanelTitle}>
          <Icons.tools />
          Data Functions
        </div>
        <button 
          className={styles.closeButton}
          onClick={toggleFunctionsPanel}
        >
          <Icons.close />
        </button>
      </div>

      <button 
        className={`${styles.functionButton} ${activeDataFunction === 'makeWallsOpaque' ? styles.activeFunctionButton : ''}`}
        onClick={() => {
          makeWallsOpaque();
          toggleDataFunction('makeWallsOpaque');
        }}
      >
        <Icons.walls /> Make Walls Opaque
      </button>
      
      <div className={styles.functionButtonGroup}>
        <button 
          className={`${styles.functionButton} ${activeDataFunction === 'getAttributes' ? styles.activeFunctionButton : ''}`}
          onClick={() => toggleDataFunction('getAttributes')}
        >
          <Icons.attributes /> Get All Attributes
        </button>
        
        <button 
          className={`${styles.functionButton} ${activeDataFunction === 'getItemPropertySets' ? styles.activeFunctionButton : ''}`}
          onClick={() => toggleDataFunction('getItemPropertySets')}
        >
          <Icons.properties /> Get Property Sets
        </button>
      </div>
      
      <div className={styles.functionHint}>
        Select an element in the model first, then click a function to view its data.
      </div>
    </div>
  );
};