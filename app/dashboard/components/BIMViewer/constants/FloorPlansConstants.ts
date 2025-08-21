import * as THREE from 'three';

export const FLOORPLAN_CATEGORIES = {
  THICK_ELEMENTS: [
    'IFCWALLSTANDARDCASE',
    'IFCWALL',
    'IFCSLAB'
  ],
  THIN_ELEMENTS: [
    'IFCDOOR',
    'IFCWINDOW',
    'IFCPLATE',
    'IFCMEMBER'
  ],
  STRUCTURAL_ELEMENTS: [
    'IFCBEAM',
    'IFCCOLUMN'
  ]
} as const;

export const DEFAULT_STYLE_CONFIG = {
  thickMaterial: {
    fill: new THREE.MeshBasicMaterial({ 
      color: 'gray', 
      side: THREE.DoubleSide 
    }),
    line: new THREE.LineBasicMaterial({ 
      color: 'black' 
    }),
    outline: new THREE.MeshBasicMaterial({
      color: 'black',
      opacity: 0.5,
      side: THREE.DoubleSide,
      transparent: true,
    })
  },
  thinMaterial: {
    line: new THREE.LineBasicMaterial({ 
      color: 'black' 
    })
  },
  backgroundColors: {
    planView: new THREE.Color('white'),
    default: null
  }
};

export const FLOORPLAN_CONFIG_DEFAULTS = {
  autoGenerateOnLoad: true,
  enableHighlighting: true,
  enableCulling: true,
  blackAndWhiteMode: true,
  outlineEnabled: true
};