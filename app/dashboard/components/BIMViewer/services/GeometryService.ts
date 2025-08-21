import * as THREE from 'three';

export class GeometryService {
  static checkForRandomGeometries(world: any): boolean {
    if (!world || !world.threeScene) return false;
    
    const scene = world.threeScene;
    const geometriesGroup = scene.getObjectByName("randomGeometries");
    return !!geometriesGroup;
  }

  static setupLightsForRandomGeometries(world: any): void {
    if (!world || !world.threeScene) {
      console.error("World or scene not initialized");
      return;
    }
    
    const scene = world.threeScene;
    const existingLights = scene.getObjectByName("randomGeometryLights");
    if (existingLights) return;
    
    const lightsGroup = new THREE.Group();
    lightsGroup.name = "randomGeometryLights";
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    lightsGroup.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 10, 10);
    lightsGroup.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x9090ff, 0.4);
    fillLight.position.set(-10, 5, -10);
    lightsGroup.add(fillLight);
    
    scene.add(lightsGroup);
  }

  static createRandomGeometry(world: any): number {
    if (!world || !world.threeScene) {
      throw new Error("World or scene not initialized");
    }
    
    this.setupLightsForRandomGeometries(world);
    
    const scene = world.threeScene;
    const group = new THREE.Group();
    group.name = "randomGeometries";
    
    const existingGroup = scene.getObjectByName("randomGeometries");
    if (existingGroup) {
      scene.remove(existingGroup);
    }
    
    const geometryTypes = ['box', 'sphere', 'cone', 'cylinder', 'torus', 'tetrahedron'];
    const count = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 0; i < count; i++) {
      const geometryType = geometryTypes[Math.floor(Math.random() * geometryTypes.length)];
      let geometry;
      
      switch (geometryType) {
        case 'box':
          geometry = new THREE.BoxGeometry(
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5
          );
          break;
        case 'sphere':
          geometry = new THREE.SphereGeometry(
            Math.random() * 1 + 0.5,
            16,
            16
          );
          break;
        case 'cone':
          geometry = new THREE.ConeGeometry(
            Math.random() * 1 + 0.5,
            Math.random() * 2 + 1,
            16
          );
          break;
        case 'cylinder':
          geometry = new THREE.CylinderGeometry(
            Math.random() * 1 + 0.5,
            Math.random() * 1 + 0.5,
            Math.random() * 2 + 1,
            16
          );
          break;
        case 'torus':
          geometry = new THREE.TorusGeometry(
            Math.random() * 1 + 0.5,
            Math.random() * 0.3 + 0.1,
            16,
            32
          );
          break;
        case 'tetrahedron':
          geometry = new THREE.TetrahedronGeometry(
            Math.random() * 1 + 0.5
          );
          break;
        default:
          geometry = new THREE.BoxGeometry(1, 1, 1);
      }
      
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random(), Math.random(), Math.random()),
        metalness: Math.random() * 0.5,
        roughness: Math.random() * 0.5 + 0.5
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      group.add(mesh);
    }
    
    scene.add(group);
    return count;
  }

  static removeRandomGeometries(world: any): boolean {
    if (!world || !world.threeScene) {
      console.error("World or scene not initialized");
      return false;
    }
    
    const scene = world.threeScene;
    const existingGroup = scene.getObjectByName("randomGeometries");
    
    if (existingGroup) {
      scene.remove(existingGroup);
      
      const lightsGroup = scene.getObjectByName("randomGeometryLights");
      if (lightsGroup) {
        scene.remove(lightsGroup);
      }
      
      return true;
    }
    
    return false;
  }
}