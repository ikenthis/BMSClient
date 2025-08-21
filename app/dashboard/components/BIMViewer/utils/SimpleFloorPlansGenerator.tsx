import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Building2, 
  Play, 
  Loader, 
  AlertTriangle,
  Eye,
  EyeOff,
  Home,
  Trash2,
  Scissors,
  Grid,
  ChevronDown,
  ChevronUp,
  Square,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

import * as THREE from 'three';

interface FloorPlan2D {
  id: string;
  name: string;
  level: number;
  cutHeight: number;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  isGenerated: boolean;
  timestamp: string;
  clipper?: any;
  isHorizontal: boolean;
}

interface FloorPlan2DGeneratorProps {
  world: any;
  fragments: any;
  models: any[];
  components?: any;
  onPlanGenerated?: (plans: FloorPlan2D[]) => void;
  onError?: (error: string) => void;
  onPlanNavigated?: (planId: string, planName: string) => void;
  onExitPlanView?: () => void;
}

const FloorPlan2DGenerator: React.FC<FloorPlan2DGeneratorProps> = ({
  world,
  fragments,
  models,
  components,
  onPlanGenerated,
  onError,
  onPlanNavigated,
  onExitPlanView
}) => {
  const [plans, setPlans] = useState<FloorPlan2D[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [is2DMode, setIs2DMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showEdges, setShowEdges] = useState(false);
  const [edgesInitialized, setEdgesInitialized] = useState(false);
  
  // Referencias para gestión de estado y clippers
  const originalCameraState = useRef<any>({});
  const activeClippers = useRef<any[]>([]);
  const clipperComponent = useRef<any>(null);
  const manualClippingPlanes = useRef<THREE.Plane[]>([]);
  const edgesComponent = useRef<any>(null);
  const classifierComponent = useRef<any>(null);

  // Inicialización del sistema de edges
  const initializeEdges = useCallback(async () => {
    if (!components || !world || !fragments || edgesInitialized) return;

    try {
      // Obtener clasificador
      let classifier = null;
      try {
        const OBC = (window as any).OBC || components.OBC;
        if (OBC && OBC.Classifier) {
          classifier = components.get(OBC.Classifier);
          if (!classifier) {
            classifier = new OBC.Classifier(components);
            components.add(classifier);
          }
        }
      } catch (e) {
        console.warn('Error obteniendo Classifier:', e);
      }

      // Obtener ClipEdges
      let edges = null;
      try {
        const OBCF = (window as any).OBCF || components.OBCF;
        if (OBCF && OBCF.ClipEdges) {
          edges = components.get(OBCF.ClipEdges);
          if (!edges) {
            edges = new OBCF.ClipEdges(components);
            components.add(edges);
          }
        }
      } catch (e) {
        console.warn('Error obteniendo ClipEdges:', e);
      }

      if (!classifier || !edges) {
        console.warn('No se pudo inicializar classifier o edges');
        return;
      }

      classifierComponent.current = classifier;
      edgesComponent.current = edges;

      // Procesar cada modelo
      models.forEach(model => {
        if (model.uuid) {
          try {
            classifier.byModel(model.uuid, model);
            classifier.byEntity(model);

            const thickItems = classifier.find({
              entities: ["IFCWALLSTANDARDCASE", "IFCWALL"],
            });

            const thinItems = classifier.find({
              entities: ["IFCDOOR", "IFCWINDOW", "IFCPLATE", "IFCMEMBER"],
            });

            const grayFill = new THREE.MeshBasicMaterial({ 
              color: "lightgray", 
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.8
            });
            
            const blackLine = new THREE.LineBasicMaterial({ 
              color: "black",
              linewidth: 2
            });
            
            const blackOutline = new THREE.MeshBasicMaterial({
              color: "black",
              opacity: 0.3,
              side: THREE.DoubleSide,
              transparent: true,
            });

            if (Object.keys(thickItems).length > 0) {
              edges.styles.create(
                "thick",
                new Set(),
                world,
                blackLine,
                grayFill,
                blackOutline,
              );

              for (const fragID in thickItems) {
                const foundFrag = fragments.list.get(fragID);
                if (!foundFrag) continue;
                const { mesh } = foundFrag;
                edges.styles.list.thick.fragments[fragID] = new Set(thickItems[fragID]);
                edges.styles.list.thick.meshes.add(mesh);
              }
            }

            if (Object.keys(thinItems).length > 0) {
              const thinLine = new THREE.LineBasicMaterial({ 
                color: "darkblue",
                linewidth: 1
              });

              const thinFill = new THREE.MeshBasicMaterial({ 
                color: "lightblue", 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
              });

              edges.styles.create(
                "thin", 
                new Set(), 
                world,
                thinLine,
                thinFill
              );

              for (const fragID in thinItems) {
                const foundFrag = fragments.list.get(fragID);
                if (!foundFrag) continue;
                const { mesh } = foundFrag;
                edges.styles.list.thin.fragments[fragID] = new Set(thinItems[fragID]);
                edges.styles.list.thin.meshes.add(mesh);
              }
            }

          } catch (modelError) {
            console.warn(`Error procesando modelo ${model.uuid}:`, modelError);
          }
        }
      });

      setEdgesInitialized(true);

    } catch (error) {
      console.error('Error inicializando edges:', error);
    }
  }, [components, world, fragments, models, edgesInitialized]);

  // Toggle edges visibility
  const toggleEdges = useCallback(async () => {
    if (!edgesInitialized) {
      await initializeEdges();
    }

    if (!edgesComponent.current) return;

    try {
      const newShowEdges = !showEdges;
      
      if (newShowEdges) {
        if (edgesComponent.current.styles?.list?.thick) {
          edgesComponent.current.styles.list.thick.visible = true;
        }
        if (edgesComponent.current.styles?.list?.thin) {
          edgesComponent.current.styles.list.thin.visible = true;
        }
      } else {
        if (edgesComponent.current.styles?.list?.thick) {
          edgesComponent.current.styles.list.thick.visible = false;
        }
        if (edgesComponent.current.styles?.list?.thin) {
          edgesComponent.current.styles.list.thin.visible = false;
        }
      }

      setShowEdges(newShowEdges);

      if (world.renderer?.three) {
        world.renderer.three.render(world.scene.three, world.camera.three);
      }

    } catch (error) {
      console.error('Error toggling edges:', error);
    }
  }, [showEdges, edgesInitialized, initializeEdges, edgesComponent, world]);

  // Inicializar edges cuando se carguen los modelos
  useEffect(() => {
    if (models.length > 0 && components && world && fragments && !edgesInitialized) {
      setTimeout(() => {
        initializeEdges();
      }, 1000);
    }
  }, [models, components, world, fragments, edgesInitialized, initializeEdges]);

  // Inicialización del Clipper con configuración ortogonal
  useEffect(() => {
    if (components && world && !clipperComponent.current) {
      try {
        let clipper = null;
        
        try {
          clipper = components.get('Clipper');
        } catch (e) {
          // No hay clipper existente, crear nuevo
        }
        
        if (!clipper) {
          try {
            const OBC = (window as any).OBC || components.OBC;
            if (OBC && OBC.Clipper) {
              clipper = new OBC.Clipper(components);
              components.add(clipper);
            }
          } catch (e) {
            // Error creando Clipper OBC
          }
        }
        
        if (clipper) {
          clipper.orthogonalY = true;
          clipper.toleranceOrthogonalY = 0.99;
          
          if (clipper.config) {
            clipper.config.orthogonalY = true;
            clipper.config.toleranceOrthogonalY = 0.99;
            clipper.config.snapToPlane = true;
          }
          
          if (clipper.onAfterCreate && clipper.onAfterCreate.add) {
            clipper.onAfterCreate.add((plane) => {
              setPlans(prevPlans => prevPlans.map(p => 
                p.id === currentPlanId ? { ...p, clipper: plane } : p
              ));
            });
          }
          
          clipperComponent.current = clipper;
        }
        
      } catch (error) {
        console.error('Error inicializando Clipper:', error);
      }
    }
  }, [components, world, currentPlanId]);

  // Guardar estado original
  useEffect(() => {
    if (!world) {
      setError('World no disponible');
      return;
    }
    if (!models || models.length === 0) {
      setError('No hay modelos cargados');
      return;
    }
    
    if (world.camera?.three) {
      originalCameraState.current = {
        position: world.camera.three.position.clone(),
        rotation: world.camera.three.rotation.clone(),
        quaternion: world.camera.three.quaternion.clone(),
        up: world.camera.three.up.clone(),
        zoom: world.camera.three.zoom,
        projection: world.camera.projection?.current,
        fov: world.camera.three.fov,
        near: world.camera.three.near,
        far: world.camera.three.far,
        isPerspectiveCamera: world.camera.three.isPerspectiveCamera,
        isOrthographicCamera: world.camera.three.isOrthographicCamera,
        left: world.camera.three.left,
        right: world.camera.three.right,
        top: world.camera.three.top,
        bottom: world.camera.three.bottom
      };
    }
    
    if (world.scene?.three?.background) {
      originalCameraState.current.background = world.scene.three.background;
    }
    
    if (world.camera?.controls) {
      originalCameraState.current.controls = {
        enableRotate: world.camera.controls.enableRotate,
        enablePan: world.camera.controls.enablePan,
        enableZoom: world.camera.controls.enableZoom,
        target: world.camera.controls.target ? world.camera.controls.target.clone() : new THREE.Vector3(),
        maxPolarAngle: world.camera.controls.maxPolarAngle,
        minPolarAngle: world.camera.controls.minPolarAngle
      };
    }
    
    setError(null);
  }, [world, models]);

  // Análisis de geometría
  const analyzeModelsGeometry = useCallback(async () => {
    let totalElements = 0;
    let minY = Infinity, maxY = -Infinity;
    const elementsAtLevels = new Map<number, number>();

    try {
      for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
        const model = models[modelIndex];
        
        if (model.items && Array.isArray(model.items)) {
          for (let i = 0; i < model.items.length; i++) {
            const fragment = model.items[i];
            
            if (fragment && fragment.mesh && fragment.mesh.geometry) {
              totalElements++;
              
              fragment.mesh.geometry.computeBoundingBox();
              const box = fragment.mesh.geometry.boundingBox;
              
              if (box && box.min && box.max) {
                const elementMinY = box.min.y;
                const elementMaxY = box.max.y;
                
                minY = Math.min(minY, elementMinY);
                maxY = Math.max(maxY, elementMaxY);
                
                const level = Math.round(elementMinY * 4) / 4;
                elementsAtLevels.set(level, (elementsAtLevels.get(level) || 0) + 1);
              }
            }
          }
        }

        if (model.three) {
          try {
            const bbox = new THREE.Box3();
            bbox.setFromObject(model.three);
            
            if (bbox.min && bbox.max && isFinite(bbox.min.y) && isFinite(bbox.max.y)) {
              minY = Math.min(minY, bbox.min.y);
              maxY = Math.max(maxY, bbox.max.y);
            }
          } catch (bboxError) {
            console.warn('Error BBox:', bboxError);
          }
        }
      }

      const levelThreshold = Math.max(5, totalElements * 0.01);
      const significantLevels = Array.from(elementsAtLevels.entries())
        .filter(([level, count]) => count >= levelThreshold)
        .map(([level]) => level)
        .sort((a, b) => a - b);

      return {
        totalElements,
        minY: minY === Infinity ? 0 : minY,
        maxY: maxY === -Infinity ? 12 : maxY,
        elementsAtLevels,
        significantLevels
      };

    } catch (error) {
      return {
        totalElements: 0,
        minY: 0,
        maxY: 12,
        elementsAtLevels: new Map(),
        significantLevels: []
      };
    }
  }, [models]);

  // Creación de corte ortogonal
  const createOrthogonalClipping = useCallback(async (cutHeight: number, planId: string) => {
    try {
      if (activeClippers.current.length > 0) {
        for (const clipper of activeClippers.current) {
          try {
            if (clipperComponent.current?.deleteAll) {
              clipperComponent.current.deleteAll();
            } else if (clipperComponent.current?.delete) {
              clipperComponent.current.delete(world, clipper);
            }
          } catch (e) {
            console.warn('Error eliminando clipper:', e);
          }
        }
        activeClippers.current = [];
      }

      if (manualClippingPlanes.current.length > 0) {
        manualClippingPlanes.current = [];
        if (world.renderer?.three) {
          world.renderer.three.clippingPlanes = [];
          world.renderer.three.localClippingEnabled = false;
        }
      }

      if (clipperComponent.current && world) {
        try {
          clipperComponent.current.orthogonalY = true;
          clipperComponent.current.toleranceOrthogonalY = 0.99;
          
          if (clipperComponent.current.config) {
            clipperComponent.current.config.orthogonalY = true;
            clipperComponent.current.config.toleranceOrthogonalY = 0.99;
          }

          const normal = new THREE.Vector3(0, 1, 0);
          const point = new THREE.Vector3(0, cutHeight, 0);
          normal.normalize();
          
          const clipPlane = clipperComponent.current.createFromNormalAndCoplanarPoint(world, normal, point);
          
          if (clipPlane) {
            activeClippers.current.push(clipPlane);
            
            clipPlane._metadata = {
              cutHeight: cutHeight,
              planId: planId,
              createdAt: new Date().toISOString(),
              type: 'orthogonal_horizontal_plan',
              orthogonalVerified: true
            };
            
            return clipPlane;
          }
        } catch (thatOpenError) {
          console.warn('Error ThatOpen Clipper:', thatOpenError);
        }
      }

      const upperNormal = new THREE.Vector3(0, -1, 0);
      const lowerNormal = new THREE.Vector3(0, 1, 0);
      
      upperNormal.normalize();
      lowerNormal.normalize();
      
      const upperPlane = new THREE.Plane(upperNormal, cutHeight);
      const lowerPlane = new THREE.Plane(lowerNormal, -(cutHeight - 2.5));
      
      manualClippingPlanes.current = [upperPlane, lowerPlane];

      if (world.renderer?.three) {
        world.renderer.three.clippingPlanes = manualClippingPlanes.current;
        world.renderer.three.localClippingEnabled = true;
        world.renderer.three.sortObjects = true;
      }

      models.forEach((model) => {
        if (model.items && Array.isArray(model.items)) {
          model.items.forEach((fragment: any) => {
            if (fragment && fragment.mesh && fragment.mesh.material) {
              const updateMaterial = (material: any) => {
                material.clippingPlanes = manualClippingPlanes.current;
                material.clipShadows = true;
                material.clipIntersection = false;
                material.needsUpdate = true;
              };

              if (Array.isArray(fragment.mesh.material)) {
                fragment.mesh.material.forEach(updateMaterial);
              } else {
                updateMaterial(fragment.mesh.material);
              }
            }
          });
        }
      });
      
      if (world.renderer?.three) {
        world.renderer.three.render(world.scene.three, world.camera.three);
      }
      
      const manualClipperResult = {
        type: 'manual_orthogonal',
        planes: manualClippingPlanes.current,
        id: `orthogonal-clipper-${Date.now()}`,
        _metadata: {
          cutHeight: cutHeight,
          planId: planId,
          createdAt: new Date().toISOString(),
          type: 'orthogonal_horizontal_plan',
          method: 'three_js_manual_orthogonal',
          orthogonalVerified: true
        }
      };
      
      return manualClipperResult;

    } catch (error) {
      console.error('Error en createOrthogonalClipping:', error);
      return null;
    }
  }, [world, models]);

  // Configuración de cámara ortogonal
  const setupOrthogonalCamera = useCallback((plan: FloorPlan2D) => {
    try {
      if (!world.camera?.three) return false;

      const camera = world.camera.three;
      const bounds = plan.boundingBox;
      
      const centerX = (bounds.min.x + bounds.max.x) / 2;
      const centerZ = (bounds.min.z + bounds.max.z) / 2;
      const height = plan.level + 100;
      
      camera.position.set(centerX, height, centerZ);
      
      const targetPoint = new THREE.Vector3(centerX, plan.level, centerZ);
      camera.lookAt(targetPoint);
      
      camera.up.set(0, 0, -1);
      
      if (world.camera.projection) {
        world.camera.projection.current = "Orthographic";
      }
      
      if (camera.isOrthographicCamera || camera.type === 'OrthographicCamera') {
        const width = bounds.max.x - bounds.min.x;
        const height = bounds.max.z - bounds.min.z;
        const margin = Math.max(width, height) * 0.1;
        
        camera.left = bounds.min.x - margin;
        camera.right = bounds.max.x + margin;
        camera.top = bounds.max.z + margin;
        camera.bottom = bounds.min.z - margin;
      } else if (camera.isPerspectiveCamera || camera.type === 'PerspectiveCamera') {
        camera.fov = 1;
        camera.near = 0.1;
        camera.far = 10000;
      }
      
      camera.updateProjectionMatrix();
      
      return true;
    } catch (error) {
      console.error('Error configurando cámara ortogonal:', error);
      return false;
    }
  }, [world]);

  // Configuración de controles ortogonales
  const setupOrthogonalControls = useCallback(() => {
    try {
      if (!world.camera?.controls) return false;

      const controls = world.camera.controls;
      
      controls.enableRotate = false;
      controls.enableZoom = true;
      controls.enablePan = true;
      
      controls.maxPolarAngle = 0.01;
      controls.minPolarAngle = 0.0;
      
      if (controls.screenSpacePanning !== undefined) {
        controls.screenSpacePanning = true;
      }
      
      if (controls.mouseButtons) {
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
        controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      }
      
      if (controls.update) controls.update();
      
      return true;
    } catch (error) {
      console.error('Error configurando controles ortogonales:', error);
      return false;
    }
  }, [world]);

  // Generación de planos
  const generatePlans = useCallback(async () => {
    if (!models || models.length === 0) {
      const errorMsg = 'No hay modelos cargados';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setCurrentPlanId(null);
    setIs2DMode(false);
    setPlans([]);
    setIsGenerating(true);
    setError(null);

    try {
      const analysis = await analyzeModelsGeometry();
      
      let levels: number[] = [];
      
      if (analysis.significantLevels && analysis.significantLevels.length > 0) {
        levels = analysis.significantLevels;
      } else {
        const startLevel = Math.floor(analysis.minY / 3) * 3;
        const endLevel = Math.ceil(analysis.maxY / 3) * 3;
        
        for (let level = startLevel; level <= endLevel; level += 3) {
          levels.push(level);
        }
        
        if (levels.length === 0) {
          levels = [0, 3, 6, 9];
        }
      }

      const generatedPlans: FloorPlan2D[] = [];
      
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const cutHeight = level + 2.2;
        
        const modelBounds = {
          min: { x: -30, y: level, z: -30 },
          max: { x: 30, y: cutHeight, z: 30 }
        };
        
        try {
          let realMinX = Infinity, realMaxX = -Infinity;
          let realMinZ = Infinity, realMaxZ = -Infinity;
          
          models.forEach(model => {
            if (model.three) {
              const bbox = new THREE.Box3();
              bbox.setFromObject(model.three);
              if (isFinite(bbox.min.x)) {
                realMinX = Math.min(realMinX, bbox.min.x);
                realMaxX = Math.max(realMaxX, bbox.max.x);
                realMinZ = Math.min(realMinZ, bbox.min.z);
                realMaxZ = Math.max(realMaxZ, bbox.max.z);
              }
            }
          });
          
          if (isFinite(realMinX)) {
            const margin = Math.max(realMaxX - realMinX, realMaxZ - realMinZ) * 0.1;
            modelBounds.min.x = realMinX - margin;
            modelBounds.max.x = realMaxX + margin;
            modelBounds.min.z = realMinZ - margin;
            modelBounds.max.z = realMaxZ + margin;
          }
        } catch (boundsError) {
          console.warn('Error calculando bounds reales:', boundsError);
        }
        
        const plan: FloorPlan2D = {
          id: `ortho-plan_${i}_${level}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: getPlanName(level),
          level: level,
          cutHeight: cutHeight,
          boundingBox: modelBounds,
          isGenerated: true,
          timestamp: new Date().toISOString(),
          isHorizontal: true
        };
        
        generatedPlans.push(plan);
      }

      if (generatedPlans.length === 0) {
        throw new Error('No se pudieron generar planos ortogonales');
      }

      setPlans(generatedPlans);
      setIsGenerating(false);
      
      if (onPlanGenerated) {
        onPlanGenerated(generatedPlans);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido generando planos';
      setError(errorMsg);
      setIsGenerating(false);
      
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [models, onPlanGenerated, onError, analyzeModelsGeometry]);

  // Navegación a plano ortogonal
  const navigateToOrthogonalPlan = useCallback(async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan || !world) {
      return;
    }

    try {
      setCurrentPlanId(planId);
      setIs2DMode(true);

      const clipper = await createOrthogonalClipping(plan.cutHeight, planId);
      
      if (clipper) {
        plan.clipper = clipper;
      }

      setupOrthogonalCamera(plan);
      setupOrthogonalControls();

      if (world.camera?.controls?.setLookAt) {
        const bounds = plan.boundingBox;
        const centerX = (bounds.min.x + bounds.max.x) / 2;
        const centerZ = (bounds.min.z + bounds.max.z) / 2;
        
        world.camera.controls.setLookAt(
          centerX, plan.level + 100, centerZ,
          centerX, plan.level, centerZ
        );
      }

      if (world.scene?.three) {
        world.scene.three.background = new THREE.Color(0xffffff);
      }

      if (world.renderer?.three) {
        world.renderer.three.setClearColor(0xffffff, 1.0);
        world.renderer.three.shadowMap.enabled = false;
        world.renderer.three.antialias = true;
      }

      if (onPlanNavigated) {
        onPlanNavigated(planId, plan.name);
      }
      
    } catch (error) {
      console.error('Error navegación ortogonal:', error);
    }
  }, [plans, world, onPlanNavigated, createOrthogonalClipping, setupOrthogonalCamera, setupOrthogonalControls]);

  // Función para obtener nombre del plano
  const getPlanName = (level: number): string => {
    if (level < 0) {
      return `Sótano ${Math.abs(Math.round(level / 3))}`;
    } else if (level === 0) {
      return 'Planta Baja';
    } else {
      return `Planta ${Math.ceil(level / 3)}`;
    }
  };

  // Función para recalcular y centrar vista del modelo
  const recenterModelView = useCallback(() => {
    if (!world.camera?.controls || !models || models.length === 0) return;

    try {
      const globalBbox = new THREE.Box3();
      let hasValidModel = false;

      models.forEach((model) => {
        if (model.three) {
          const modelBbox = new THREE.Box3();
          modelBbox.setFromObject(model.three);
          
          if (modelBbox.min.isFinite() && modelBbox.max.isFinite()) {
            globalBbox.expandByBox(modelBbox);
            hasValidModel = true;
          }
        }
        
        if (model.items && Array.isArray(model.items)) {
          model.items.forEach((fragment: any) => {
            if (fragment && fragment.mesh) {
              const fragmentBbox = new THREE.Box3();
              fragmentBbox.setFromObject(fragment.mesh);
              
              if (fragmentBbox.min.isFinite() && fragmentBbox.max.isFinite()) {
                globalBbox.expandByBox(fragmentBbox);
                hasValidModel = true;
              }
            }
          });
        }
      });

      if (hasValidModel && globalBbox.min.isFinite() && globalBbox.max.isFinite()) {
        const center = new THREE.Vector3();
        globalBbox.getCenter(center);
        
        const size = globalBbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 1.5;
        
        world.camera.controls.setLookAt(
          center.x + distance,
          center.y + distance * 0.5,
          center.z + distance,
          center.x,
          center.y,
          center.z,
          true // animated
        );
      }
    } catch (error) {
      console.error('Error recentrando vista:', error);
    }
  }, [world, models]);

  // Salir de vista ortogonal mejorado
  const exitOrthogonalView = useCallback(async () => {
    try {
      setIs2DMode(false);
      setCurrentPlanId(null);

      // Limpiar clippers
      if (clipperComponent.current && activeClippers.current.length > 0) {
        try {
          if (typeof clipperComponent.current.deleteAll === 'function') {
            clipperComponent.current.deleteAll();
          } else {
            for (const clipper of activeClippers.current) {
              try {
                clipperComponent.current.delete(world, clipper);
              } catch (clipperError) {
                console.warn('Error eliminando clipper:', clipperError);
              }
            }
          }
          activeClippers.current = [];
        } catch (deleteError) {
          console.error('Error limpieza ThatOpen clippers:', deleteError);
        }
      }

      // Limpiar clipping planes manuales
      if (manualClippingPlanes.current.length > 0) {
        if (world.renderer?.three) {
          world.renderer.three.clippingPlanes = [];
          world.renderer.three.localClippingEnabled = false;
          world.renderer.three.sortObjects = false;
        }

        models.forEach((model) => {
          if (model.items && Array.isArray(model.items)) {
            model.items.forEach((fragment: any) => {
              if (fragment && fragment.mesh && fragment.mesh.material) {
                const clearMaterial = (material: any) => {
                  material.clippingPlanes = [];
                  material.clipShadows = false;
                  material.clipIntersection = false;
                  material.needsUpdate = true;
                };

                if (Array.isArray(fragment.mesh.material)) {
                  fragment.mesh.material.forEach(clearMaterial);
                } else {
                  clearMaterial(fragment.mesh.material);
                }
              }
            });
          }
        });
        
        manualClippingPlanes.current = [];
      }

      // Restaurar estado original de cámara
      if (world.camera?.three && originalCameraState.current.position) {
        const camera = world.camera.three;
        
        camera.position.copy(originalCameraState.current.position);
        camera.rotation.copy(originalCameraState.current.rotation);
        camera.quaternion.copy(originalCameraState.current.quaternion);
        camera.up.copy(originalCameraState.current.up);
        camera.zoom = originalCameraState.current.zoom;
        
        if (originalCameraState.current.fov !== undefined) {
          camera.fov = originalCameraState.current.fov;
        }
        if (originalCameraState.current.near !== undefined) {
          camera.near = originalCameraState.current.near;
        }
        if (originalCameraState.current.far !== undefined) {
          camera.far = originalCameraState.current.far;
        }
        
        if (originalCameraState.current.left !== undefined) {
          camera.left = originalCameraState.current.left;
        }
        if (originalCameraState.current.right !== undefined) {
          camera.right = originalCameraState.current.right;
        }
        if (originalCameraState.current.top !== undefined) {
          camera.top = originalCameraState.current.top;
        }
        if (originalCameraState.current.bottom !== undefined) {
          camera.bottom = originalCameraState.current.bottom;
        }
        
        camera.updateProjectionMatrix();
      }

      // Restaurar proyección
      if (world.camera?.projection && originalCameraState.current.projection) {
        world.camera.projection.current = originalCameraState.current.projection;
      }

      // Restaurar controles
      if (world.camera?.controls && originalCameraState.current.controls) {
        const controls = world.camera.controls;
        const originalControls = originalCameraState.current.controls;
        
        controls.enableRotate = originalControls.enableRotate;
        controls.enablePan = originalControls.enablePan;
        controls.enableZoom = originalControls.enableZoom;
        
        if (controls.target && originalControls.target) {
          controls.target.copy(originalControls.target);
        }
        
        controls.maxPolarAngle = originalControls.maxPolarAngle;
        controls.minPolarAngle = originalControls.minPolarAngle;
        
        if (controls.update) controls.update();
      }

      // Restaurar fondo de escena
      if (world.scene?.three && originalCameraState.current.background !== undefined) {
        world.scene.three.background = originalCameraState.current.background;
      } else if (world.scene?.three) {
        world.scene.three.background = new THREE.Color(0x111827);
      }

      // Restaurar renderer
      if (world.renderer?.three) {
        const bgColor = originalCameraState.current.background?.hex || 0x111827;
        world.renderer.three.setClearColor(bgColor, 1.0);
        world.renderer.three.shadowMap.enabled = true;
      }

      // Limpiar metadatos de planos
      plans.forEach(plan => {
        if (plan.clipper) {
          plan.clipper = undefined;
        }
      });

      setTimeout(() => {
        recenterModelView();
      }, 100);

      if (world.renderer?.three) {
        world.renderer.three.render(world.scene.three, world.camera.three);
      }

      if (onExitPlanView) {
        onExitPlanView();
      }
      
    } catch (error) {
      console.error('Error crítico saliendo de vista ortogonal:', error);
    }
  }, [world, plans, onExitPlanView, models, recenterModelView]);

  return (
    <div className="w-full max-h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md">
              <Grid size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Planos 2D</h2>
              {is2DMode && (
                <p className="text-xs text-green-600">
                  {plans.find(p => p.id === currentPlanId)?.name}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botón Volver a 3D - SIEMPRE VISIBLE en modo 2D */}
            {is2DMode && (
              <button
                onClick={exitOrthogonalView}
                className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors border border-red-300"
              >
                <Home size={14} />
                Volver a 3D
              </button>
            )}
            
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="h-[calc(100vh-80px)] overflow-y-auto p-3 space-y-3">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-red-700">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs text-red-600 hover:text-red-800 mt-1 underline"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Botón Principal */}
          <button
            onClick={generatePlans}
            disabled={isGenerating || !world || !models?.length}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded border-2 transition-all text-sm font-medium ${
              isGenerating || !world || !models?.length
                ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader size={16} className="animate-spin" />
                Generando planos...
              </>
            ) : (
              <>
                <Grid size={16} />
                {plans.length > 0 ? 'Regenerar Planos' : 'Generar Planos 2D'}
              </>
            )}
          </button>

          {/* Control de Edges */}
          {models.length > 0 && (
            <div className="bg-white rounded border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Aristas</h3>
                </div>
                
                <button
                  onClick={toggleEdges}
                  disabled={!edgesInitialized && models.length === 0}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
                    showEdges
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  } ${!edgesInitialized && models.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {showEdges ? (
                    <>
                      <ToggleRight size={16} />
                      ON
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={16} />
                      OFF
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Lista de Planos - PANEL MÁS ALTO */}
          {plans.length > 0 && (
            <div className="bg-white rounded border border-gray-200">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Plantas ({plans.length})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    if (clipperComponent.current && activeClippers.current.length > 0) {
                      if (clipperComponent.current.deleteAll) {
                        clipperComponent.current.deleteAll();
                      } else {
                        activeClippers.current.forEach(clipper => {
                          try {
                            clipperComponent.current.delete(world, clipper);
                          } catch (e) {
                            console.warn('Error limpiando clipper:', e);
                          }
                        });
                      }
                      activeClippers.current = [];
                    }
                    
                    if (manualClippingPlanes.current.length > 0) {
                      if (world.renderer?.three) {
                        world.renderer.three.clippingPlanes = [];
                        world.renderer.three.localClippingEnabled = false;
                      }
                      manualClippingPlanes.current = [];
                    }
                    
                    setPlans([]);
                    setCurrentPlanId(null);
                    if (is2DMode) exitOrthogonalView();
                  }}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  <Trash2 size={12} />
                  Limpiar
                </button>
              </div>

              {/* Lista de plantas con altura aumentada */}
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 gap-1 p-2">
                  {plans.map((plan, index) => (
                    <div
                      key={plan.id}
                      className={`p-3 rounded border cursor-pointer transition-all hover:shadow-sm ${
                        currentPlanId === plan.id
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => navigateToOrthogonalPlan(plan.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${
                            currentPlanId === plan.id 
                              ? 'bg-blue-100' 
                              : 'bg-gray-100'
                          }`}>
                            <Building2 size={12} className={
                              currentPlanId === plan.id 
                                ? 'text-blue-600' 
                                : 'text-gray-600'
                            } />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{plan.name}</h4>
                            <p className="text-xs text-gray-500">
                              Nivel {plan.level}m
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {currentPlanId === plan.id ? (
                            <>
                              <Scissors size={12} className="text-green-500" />
                              <Eye size={12} className="text-blue-500" />
                            </>
                          ) : (
                            <EyeOff size={12} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Controles de navegación */}
          {is2DMode && plans.length > 1 && (
            <div className="bg-white rounded border border-gray-200 p-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const currentIndex = plans.findIndex(p => p.id === currentPlanId);
                    const prevIndex = currentIndex === 0 ? plans.length - 1 : currentIndex - 1;
                    navigateToOrthogonalPlan(plans[prevIndex].id);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
                >
                  <ChevronUp size={14} />
                  Anterior
                </button>
                
                <button
                  onClick={() => {
                    const currentIndex = plans.findIndex(p => p.id === currentPlanId);
                    const nextIndex = (currentIndex + 1) % plans.length;
                    navigateToOrthogonalPlan(plans[nextIndex].id);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
                >
                  <ChevronDown size={14} />
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FloorPlan2DGenerator;