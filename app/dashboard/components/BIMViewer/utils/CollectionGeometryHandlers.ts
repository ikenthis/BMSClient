// utils/CollectionGeometryHandler.ts
// Gestor de geometrías para colecciones de arte en espacios

import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';

// Tipo para los datos básicos necesarios para crear una geometría de colección
export interface CollectionGeometryData {
  id: string;               // ID único de la colección
  spaceGuid: string;        // GUID del espacio IFC
  position: {               // Posición en coordenadas 3D
    x: number;
    y: number;
    z: number;
  };
  name: string;             // Nombre de la colección para mostrar en etiquetas
  type: string;             // Tipo de colección (pintura, escultura, etc.)
  scale?: {                 // Escala opcional (predeterminada: 1,1,1)
    x: number;
    y: number;
    z: number;
  };
  color?: string | number;  // Color personalizado en formato hexadecimal o THREE.Color
}

// Clase para manejar las geometrías de colecciones
class CollectionGeometryHandler {
  // Materiales predefinidos por tipo de colección
  private static readonly MATERIAL_COLORS: Record<string, number> = {
    'Pintura': 0x1E88E5,     // Azul
    'Escultura': 0x43A047,   // Verde
    'Libro': 0xFB8C00,       // Naranja
    'Manuscrito': 0x8E24AA,  // Púrpura
    'Fotografía': 0x546E7A,  // Gris azulado
    'Textil': 0xD81B60,      // Rosa
    'Cerámica': 0xF4511E,    // Rojo-naranja
    'Joyería': 0xFFD600,     // Amarillo dorado
    'default': 0x3F51B5      // Índigo (color predeterminado)
  };

  // Referencias
  private scene: THREE.Scene | null = null;
  private worldRef: any = null;
  
  // Almacenamiento de geometrías creadas
  private collectionGeometries: Map<string, THREE.Object3D> = new Map();
  private collectionData: Map<string, CollectionGeometryData> = new Map();
  
  // Grupo para contener todas las geometrías de colección
  private collectionGroup: THREE.Group | null = null;
  
  // Nombre para el grupo en la escena
  private readonly GROUP_NAME = "artCollectionGeometries";
  
  // Constructor
  constructor() {
    this.collectionGeometries = new Map();
    this.collectionData = new Map();
  }
  
  // Inicializar - debe llamarse cuando el mundo 3D esté listo
  public initialize(world: any): void {
    if (!world || !world.scene || !world.scene.three) {
      console.error("No se pudo inicializar CollectionGeometryHandler: mundo o escena no válidos");
      return;
    }
    
    this.worldRef = world;
    this.scene = world.scene.three;
    
    // Recuperar grupo existente o crear uno nuevo
    let group = this.scene.getObjectByName(this.GROUP_NAME);
    if (!group) {
      group = new THREE.Group();
      group.name = this.GROUP_NAME;
      this.scene.add(group);
    }
    
    this.collectionGroup = group as THREE.Group;
    
    // Cargar geometrías guardadas
    this.loadSavedGeometries();
    
    console.log("CollectionGeometryHandler inicializado correctamente");
  }
  
  // Verificar si está inicializado
  public isInitialized(): boolean {
    return !!this.scene && !!this.worldRef && !!this.collectionGroup;
  }
  
  // Crear una nueva geometría para una colección
  public createCollectionGeometry(data: CollectionGeometryData): THREE.Object3D | null {
    if (!this.isInitialized()) {
      console.error("CollectionGeometryHandler no inicializado. Llame a initialize() primero.");
      return null;
    }
    
    // Validar datos esenciales
    if (!data.id || !data.spaceGuid || !data.position) {
      console.error("Datos insuficientes para crear geometría de colección", data);
      return null;
    }
    
    // Si ya existe una geometría con este ID, eliminarla
    if (this.collectionGeometries.has(data.id)) {
      this.removeCollectionGeometry(data.id);
    }
    
    // Crear geometría según el tipo de colección
    const geometry = this.createGeometryByType(data.type);
    
    // Determinar color del material
    const colorValue = data.color || 
                      CollectionGeometryHandler.MATERIAL_COLORS[data.type] || 
                      CollectionGeometryHandler.MATERIAL_COLORS.default;
    
    // Crear material con el color correspondiente
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorValue),
      transparent: true,
      opacity: 0.8,
      metalness: 0.3,
      roughness: 0.7
    });
    
    // Crear mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `collection-${data.id}`;
    
    // Establecer posición
    mesh.position.set(
      data.position.x,
      data.position.y,
      data.position.z
    );
    
    // Establecer escala si está definida
    if (data.scale) {
      mesh.scale.set(
        data.scale.x || 1,
        data.scale.y || 1,
        data.scale.z || 1
      );
    }
    
    // Añadir al grupo de colecciones
    this.collectionGroup?.add(mesh);
    
    // Guardar referencias
    this.collectionGeometries.set(data.id, mesh);
    this.collectionData.set(data.id, {...data});
    
    // Guardar datos para persistencia
    this.saveGeometryData();
    
    return mesh;
  }
  
  // Eliminar una geometría por ID
  public removeCollectionGeometry(id: string): boolean {
    if (!this.isInitialized() || !this.collectionGeometries.has(id)) {
      return false;
    }
    
    const geometry = this.collectionGeometries.get(id);
    if (geometry && this.collectionGroup) {
      // Eliminar del grupo de la escena
      this.collectionGroup.remove(geometry);
      
      // Liberar recursos de Three.js
      if (geometry instanceof THREE.Mesh) {
        // Dispose de geometría y material
        if (geometry.geometry) {
          geometry.geometry.dispose();
        }
        if (geometry.material) {
          if (Array.isArray(geometry.material)) {
            geometry.material.forEach(m => m.dispose());
          } else {
            geometry.material.dispose();
          }
        }
      }
      
      // Eliminar referencias
      this.collectionGeometries.delete(id);
      this.collectionData.delete(id);
      
      // Guardar cambios
      this.saveGeometryData();
      return true;
    }
    
    return false;
  }
  
  // Actualizar posición u otros datos de una geometría existente
  public updateCollectionGeometry(data: CollectionGeometryData): boolean {
    if (!this.isInitialized() || !this.collectionGeometries.has(data.id)) {
      return false;
    }
    
    const geometry = this.collectionGeometries.get(data.id);
    if (!geometry) return false;
    
    // Actualizar posición
    if (data.position) {
      geometry.position.set(
        data.position.x,
        data.position.y,
        data.position.z
      );
    }
    
    // Actualizar escala si está definida
    if (data.scale) {
      geometry.scale.set(
        data.scale.x || 1,
        data.scale.y || 1,
        data.scale.z || 1
      );
    }
    
    // Actualizar datos almacenados
    this.collectionData.set(data.id, {...data});
    
    // Guardar cambios
    this.saveGeometryData();
    
    return true;
  }
  
  // Obtener todas las geometrías para un espacio específico
  public getGeometriesBySpace(spaceGuid: string): THREE.Object3D[] {
    const geometries: THREE.Object3D[] = [];
    
    this.collectionData.forEach((data, id) => {
      if (data.spaceGuid === spaceGuid && this.collectionGeometries.has(id)) {
        const geometry = this.collectionGeometries.get(id);
        if (geometry) {
          geometries.push(geometry);
        }
      }
    });
    
    return geometries;
  }
  
  // Mostrar solo las geometrías para un espacio específico
  public showOnlySpaceGeometries(spaceGuid: string): void {
    if (!this.isInitialized()) return;
    
    this.collectionGeometries.forEach((geometry, id) => {
      const data = this.collectionData.get(id);
      if (data) {
        geometry.visible = data.spaceGuid === spaceGuid;
      }
    });
    
    // Actualizar el renderizado si es posible
    if (this.worldRef && this.worldRef.fragments) {
      this.worldRef.fragments.update(true);
    }
  }
  
  // Mostrar todas las geometrías
  public showAllGeometries(): void {
    if (!this.isInitialized()) return;
    
    this.collectionGeometries.forEach(geometry => {
      geometry.visible = true;
    });
    
    // Actualizar el renderizado si es posible
    if (this.worldRef && this.worldRef.fragments) {
      this.worldRef.fragments.update(true);
    }
  }
  
  // Ocultar todas las geometrías
  public hideAllGeometries(): void {
    if (!this.isInitialized()) return;
    
    this.collectionGeometries.forEach(geometry => {
      geometry.visible = false;
    });
    
    // Actualizar el renderizado si es posible
    if (this.worldRef && this.worldRef.fragments) {
      this.worldRef.fragments.update(true);
    }
  }
  
  // Verificar si hay geometrías en un espacio específico
  public hasGeometriesInSpace(spaceGuid: string): boolean {
    for (const data of this.collectionData.values()) {
      if (data.spaceGuid === spaceGuid) {
        return true;
      }
    }
    return false;
  }
  
  // Obtener el número de geometrías en un espacio
  public getGeometriesCountInSpace(spaceGuid: string): number {
    let count = 0;
    for (const data of this.collectionData.values()) {
      if (data.spaceGuid === spaceGuid) {
        count++;
      }
    }
    return count;
  }
  
  // Crear geometría según el tipo de colección
  private createGeometryByType(type: string): THREE.BufferGeometry {
    switch (type) {
      case 'Pintura':
        // Cuadro plano para pinturas
        return new THREE.BoxGeometry(1.2, 0.8, 0.05);
        
      case 'Escultura':
        // Forma más compleja para esculturas
        return new THREE.SphereGeometry(0.5, 8, 8);
        
      case 'Libro':
      case 'Manuscrito':
        // Forma de libro
        return new THREE.BoxGeometry(0.3, 0.4, 0.1);
        
      case 'Fotografía':
        // Similar a pintura pero más pequeño
        return new THREE.BoxGeometry(0.4, 0.3, 0.02);
        
      case 'Textil':
        // Forma ondulada para representar telas
        return new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8, 1, false);
        
      case 'Cerámica':
        // Forma de vasija
        return new THREE.CylinderGeometry(0.3, 0.2, 0.6, 12);
        
      case 'Joyería':
        // Forma brillante para joyas
        return new THREE.OctahedronGeometry(0.3);
        
      default:
        // Forma predeterminada para otros tipos
        return new THREE.BoxGeometry(0.5, 0.5, 0.5);
    }
  }
  
  // Guardar datos de geometrías en localStorage para persistencia
  private saveGeometryData(): void {
    if (!window.localStorage) return;
    
    const dataToSave: Record<string, CollectionGeometryData> = {};
    
    this.collectionData.forEach((data, id) => {
      dataToSave[id] = data;
    });
    
    try {
      window.localStorage.setItem('artCollectionGeometries', JSON.stringify(dataToSave));
      console.log(`Guardados datos de ${Object.keys(dataToSave).length} geometrías de colección`);
    } catch (error) {
      console.error("Error al guardar datos de geometrías:", error);
    }
  }
  
  // Cargar geometrías guardadas
  private loadSavedGeometries(): void {
    if (!window.localStorage || !this.isInitialized()) return;
    
    try {
      const savedData = window.localStorage.getItem('artCollectionGeometries');
      if (!savedData) return;
      
      const parsedData: Record<string, CollectionGeometryData> = JSON.parse(savedData);
      
      // Crear geometrías para cada elemento guardado
      Object.values(parsedData).forEach(data => {
        this.createCollectionGeometry(data);
      });
      
      console.log(`Cargadas ${Object.keys(parsedData).length} geometrías de colecciones`);
    } catch (error) {
      console.error("Error al cargar geometrías guardadas:", error);
    }
  }

  // Verificar si existe una geometría con el ID dado
public hasGeometry(id: string): boolean {
    return this.collectionGeometries.has(id);
  }
  
  // Obtener todos los IDs de geometrías
  public getAllGeometryIds(): string[] {
    return Array.from(this.collectionGeometries.keys());
  }
  
  // Limpiar todas las geometrías
  public clear(): void {
    if (!this.isInitialized()) return;
    
    if (this.collectionGroup) {
      // Eliminar todos los hijos del grupo
      while (this.collectionGroup.children.length > 0) {
        this.collectionGroup.remove(this.collectionGroup.children[0]);
      }
    }
    
    // Limpiar mapas de datos
    this.collectionGeometries.clear();
    this.collectionData.clear();
    
    // Guardar estado (vacío)
    this.saveGeometryData();
  }
  
  // Método para crear una colección directamente (método de conveniencia)
  public createCollectionWithDefaults(spaceGuid: string, position: THREE.Vector3, name: string, type: string): THREE.Object3D | null {
    if (!this.isInitialized() || !spaceGuid) {
      return null;
    }
    
    // Generar un ID único para la colección
    const id = `art-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Crear datos para la geometría
    const data: CollectionGeometryData = {
      id,
      spaceGuid,
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      },
      name: name || `Colección ${id}`,
      type: type || 'default'
    };
    
    // Crear la geometría
    return this.createCollectionGeometry(data);
  }
}

// Exportar una única instancia (singleton)
export const collectionGeometryHandler = new CollectionGeometryHandler();
export default collectionGeometryHandler;