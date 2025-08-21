// ElementZoomUtils.ts
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import * as THREE from 'three';

// Definición de materiales para visualización
const ISOLATED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0.2, 0.6, 1.0), // Azul
  opacity: 1.0,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: false
};

const NON_ISOLATED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0.5, 0.5, 0.5), // Gris
  opacity: 0.1, // 10% opacidad predeterminada
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: true
};

const SELECTED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(1.0, 0.8, 0.0), // Dorado
  opacity: 1.0,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: false
};



/**
 * Hacer zoom a un elemento específico
 */
export async function zoomToElement(
  model: FRAGS.FragmentsModel,
  elementId: number,
  world: OBC.World,
  fragments: FRAGS.FragmentsModels,
  options: {
    zoomFactor?: number,
    showBoundingBox?: boolean,
    boundingBoxDuration?: number,
    highlightElement?: boolean,
    highlightColor?: THREE.Color,
    nonIsolatedOpacity?: number,
    makeOthersTransparent?: boolean
  } = {}
): Promise<boolean> {
  try {
    // Opciones por defecto
    const {
      zoomFactor = 2.5,
      showBoundingBox = true,
      boundingBoxDuration = 3000, // ms
      highlightElement = true,
      highlightColor = new THREE.Color(1.0, 0.8, 0.0), // Dorado
      nonIsolatedOpacity = 0.1,
      makeOthersTransparent = true
    } = options;
    
    // Crear materiales personalizados si se modifican opciones
    const nonIsolatedMaterial = { ...NON_ISOLATED_MATERIAL };
    nonIsolatedMaterial.opacity = nonIsolatedOpacity;
    
    const selectedMaterial = { ...SELECTED_MATERIAL };
    selectedMaterial.color = highlightColor;
    
    // Si queremos hacer transparentes los demás elementos
    if (makeOthersTransparent) {
      // Aplicar material semitransparente a todos los elementos de todos los modelos
      await makeAllElementsTransparent(model, nonIsolatedMaterial);
    }
    
    // Resaltar el elemento específico si se solicita
    if (highlightElement) {
      await model.highlight([elementId], selectedMaterial);
      await fragments.update(true);
    }
    
    // Obtener la caja delimitadora del elemento usando getBoxes()
    const boxes = await model.getBoxes([elementId]);
    
    if (!boxes || boxes.length === 0) {
      console.error(`No se pudo obtener la caja delimitadora para el elemento ID ${elementId}`);
      return false;
    }
    
    const box = boxes[0];
    
    // Mostrar bounding box visual si se solicita
    let boxHelper: THREE.Box3Helper | null = null;
    
    if (showBoundingBox && world.scene && world.scene.three) {
      boxHelper = new THREE.Box3Helper(box, highlightColor);
      world.scene.three.add(boxHelper);
      
      // Configurar eliminación automática después del tiempo especificado
      if (boundingBoxDuration > 0) {
        setTimeout(() => {
          if (boxHelper && boxHelper.parent) {
            boxHelper.parent.remove(boxHelper);
          }
        }, boundingBoxDuration);
      }
    }
    
    // Hacer zoom al elemento
    await zoomToBox(world, box, zoomFactor);
    
    return true;
  } catch (error) {
    console.error("Error en zoomToElement:", error);
    return false;
  }
}

/**
 * Hacer zoom a múltiples elementos
 */
export async function zoomToElements(
  model: FRAGS.FragmentsModel,
  elementIds: number[],
  world: OBC.World,
  fragments: FRAGS.FragmentsModels,
  options: {
    zoomFactor?: number,
    showBoundingBox?: boolean,
    boundingBoxDuration?: number,
    highlightElements?: boolean,
    highlightColor?: THREE.Color,
    nonIsolatedOpacity?: number,
    makeOthersTransparent?: boolean
  } = {}
): Promise<boolean> {
  try {
    if (!elementIds || elementIds.length === 0) {
      return false;
    }
    
    // Opciones por defecto
    const {
      zoomFactor = 1.5,
      showBoundingBox = true,
      boundingBoxDuration = 3000,
      highlightElements = true,
      highlightColor = new THREE.Color(0.2, 0.6, 1.0), // Azul
      nonIsolatedOpacity = 0.1,
      makeOthersTransparent = true
    } = options;
    
    // Crear materiales personalizados si se modifican opciones
    const nonIsolatedMaterial = { ...NON_ISOLATED_MATERIAL };
    nonIsolatedMaterial.opacity = nonIsolatedOpacity;
    
    const highlightMaterial = { ...ISOLATED_MATERIAL };
    highlightMaterial.color = highlightColor;
    
    // Si queremos hacer transparentes los demás elementos
    if (makeOthersTransparent) {
      // Aplicar material semitransparente a todos los elementos del modelo
      await makeAllElementsTransparent(model, nonIsolatedMaterial);
    }
    
    // Resaltar los elementos específicos si se solicita
    if (highlightElements) {
      await model.highlight(elementIds, highlightMaterial);
      await fragments.update(true);
    }
    
    // Obtener las cajas delimitadoras de todos los elementos
    const boxes = await model.getBoxes(elementIds);
    
    if (!boxes || boxes.length === 0) {
      console.error('No se pudieron obtener cajas delimitadoras para los elementos');
      return false;
    }
    
    // Crear una caja que contenga todas las cajas individuales
    const combinedBox = new THREE.Box3();
    
    for (const box of boxes) {
      if (box && box.isBox3) {
        combinedBox.union(box);
      }
    }
    
    // Verificar que la caja combinada es válida
    if (combinedBox.isEmpty()) {
      console.error('La caja delimitadora combinada está vacía');
      return false;
    }
    
    // Mostrar bounding box visual si se solicita
    let boxHelper: THREE.Box3Helper | null = null;
    
    if (showBoundingBox && world.scene && world.scene.three) {
      boxHelper = new THREE.Box3Helper(combinedBox, highlightColor);
      world.scene.three.add(boxHelper);
      
      // Configurar eliminación automática después del tiempo especificado
      if (boundingBoxDuration > 0) {
        setTimeout(() => {
          if (boxHelper && boxHelper.parent) {
            boxHelper.parent.remove(boxHelper);
          }
        }, boundingBoxDuration);
      }
    }
    
    // Hacer zoom a la caja combinada
    await zoomToBox(world, combinedBox, zoomFactor);
    
    return true;
  } catch (error) {
    console.error("Error en zoomToElements:", error);
    return false;
  }
}
/**
 * Hacer zoom a todos los elementos de una categoría
 */
export async function zoomToCategory(
  model: FRAGS.FragmentsModel,
  categoryId: string,
  world: OBC.World,
  fragments: FRAGS.FragmentsModels,
  options: {
    zoomFactor?: number,
    showBoundingBox?: boolean,
    boundingBoxDuration?: number,
    highlightElements?: boolean,
    highlightColor?: THREE.Color,
    nonIsolatedOpacity?: number,
    makeOthersTransparent?: boolean
  } = {}
): Promise<boolean> {
  try {
    // Opciones por defecto
    const {
      zoomFactor = 1.2,
      showBoundingBox = true,
      boundingBoxDuration = 3000,
      highlightElements = true,
      highlightColor = new THREE.Color(0.2, 0.6, 1.0), // Azul
      nonIsolatedOpacity = 0.1,
      makeOthersTransparent = true
    } = options;
    
    // Obtener elementos de esta categoría
    const items = await model.getItemsOfCategory(categoryId);
    
    // Extraer los localIds
    const localIds: number[] = [];
    for (const item of items) {
      const localId = await item.getLocalId();
      if (localId !== null) {
        localIds.push(localId);
      }
    }
    
    if (localIds.length === 0) {
      console.error(`No se encontraron elementos en la categoría ${categoryId}`);
      return false;
    }
    
    // Usar la función de zoom a múltiples elementos
    return await zoomToElements(
      model,
      localIds,
      world,
      fragments,
      {
        zoomFactor,
        showBoundingBox,
        boundingBoxDuration,
        highlightElements,
        highlightColor,
        nonIsolatedOpacity,
        makeOthersTransparent
      }
    );
  } catch (error) {
    console.error(`Error en zoomToCategory para categoría ${categoryId}:`, error);
    return false;
  }
}

/**
 * Hacer zoom a elementos de una subcategoría específica
 * Esta función es útil cuando tienes subcategorías personalizadas no presentes en IFC
 */
export async function zoomToSubCategory(
  model: FRAGS.FragmentsModel,
  categoryId: string,
  subCategoryFilter: (element: any) => boolean,
  world: OBC.World,
  fragments: FRAGS.FragmentsModels,
  options: {
    zoomFactor?: number,
    showBoundingBox?: boolean,
    boundingBoxDuration?: number,
    highlightElements?: boolean,
    highlightColor?: THREE.Color,
    nonIsolatedOpacity?: number,
    makeOthersTransparent?: boolean,
    maxElements?: number
  } = {}
): Promise<boolean> {
  try {
    // Opciones por defecto
    const {
      zoomFactor = 1.5,
      showBoundingBox = true,
      boundingBoxDuration = 3000,
      highlightElements = true,
      highlightColor = new THREE.Color(0.2, 0.6, 1.0),
      nonIsolatedOpacity = 0.1,
      makeOthersTransparent = true,
      maxElements = 1000 // Límite para evitar sobrecarga
    } = options;
    
    // Obtener elementos de la categoría principal
    const items = await model.getItemsOfCategory(categoryId);
    
    // Extraer los localIds de todos los elementos
    const allLocalIds: number[] = [];
    const allItems: { localId: number, data: any }[] = [];
    
    // Primero recolectamos todos los IDs y datos básicos
    for (const item of items) {
      const localId = await item.getLocalId();
      if (localId !== null) {
        allLocalIds.push(localId);
        allItems.push({ localId, data: null });
      }
    }
    
    if (allLocalIds.length === 0) {
      console.error(`No se encontraron elementos en la categoría ${categoryId}`);
      return false;
    }
    
    // Obtener datos de todos los elementos para filtrar por subcategoría
    // Hacemos esto en lotes para evitar sobrecarga
    const BATCH_SIZE = 200;
    for (let i = 0; i < allLocalIds.length; i += BATCH_SIZE) {
      const batchIds = allLocalIds.slice(i, i + BATCH_SIZE);
      const itemsData = await model.getItemsData(batchIds, {
        attributesDefault: false,
        attributes: ["Name", "ObjectType", "Description", "PredefinedType"]
      });
      
      // Asociar datos con los elementos correspondientes
      for (let j = 0; j < batchIds.length; j++) {
        const index = allItems.findIndex(item => item.localId === batchIds[j]);
        if (index !== -1) {
          allItems[index].data = itemsData[j];
        }
      }
    }
    
    // Filtrar elementos por la función de subcategoría
    const filteredItems = allItems
      .filter(item => item.data && subCategoryFilter(item.data))
      .slice(0, maxElements); // Limitar cantidad para evitar problemas de rendimiento
    
    // Extraer IDs de los elementos filtrados
    const filteredIds = filteredItems.map(item => item.localId);
    
    if (filteredIds.length === 0) {
      console.error(`No se encontraron elementos que cumplan con el filtro de subcategoría`);
      return false;
    }
    
    // Usar la función de zoom a múltiples elementos
    return await zoomToElements(
      model,
      filteredIds,
      world,
      fragments,
      {
        zoomFactor,
        showBoundingBox,
        boundingBoxDuration,
        highlightElements,
        highlightColor,
        nonIsolatedOpacity,
        makeOthersTransparent
      }
    );
  } catch (error) {
    console.error(`Error en zoomToSubCategory:`, error);
    return false;
  }
}

/**
 * Hacer zoom a una propiedad específica
 * Por ejemplo, todos los elementos con un cierto material o tipo
 */
export async function zoomToElementsByProperty(
  model: FRAGS.FragmentsModel,
  propertyFilter: { 
    property: string, 
    value: any,
    categories?: string[] // Opcional: limitar a ciertas categorías
  },
  world: OBC.World,
  fragments: FRAGS.FragmentsModels,
  options: {
    zoomFactor?: number,
    showBoundingBox?: boolean,
    boundingBoxDuration?: number,
    highlightElements?: boolean,
    highlightColor?: THREE.Color,
    nonIsolatedOpacity?: number,
    makeOthersTransparent?: boolean,
    maxElements?: number
  } = {}
): Promise<boolean> {
  try {
    // Opciones por defecto
    const {
      zoomFactor = 1.5,
      showBoundingBox = true,
      boundingBoxDuration = 3000,
      highlightElements = true,
      highlightColor = new THREE.Color(0.2, 0.6, 1.0),
      nonIsolatedOpacity = 0.1,
      makeOthersTransparent = true,
      maxElements = 1000 // Límite para evitar sobrecarga
    } = options;
    
    const { property, value, categories } = propertyFilter;
    
    // Determinar categorías a procesar
    let categoriesToProcess: string[];
    
    if (categories && categories.length > 0) {
      categoriesToProcess = categories;
    } else {
      // Si no se especifican categorías, usar todas las disponibles
      categoriesToProcess = await model.getCategories();
    }
    
    // Recolectar todos los elementos de las categorías seleccionadas
    const allItems: { localId: number, category: string, data: any }[] = [];
    
    for (const category of categoriesToProcess) {
      const items = await model.getItemsOfCategory(category);
      
      // Extraer los localIds
      for (const item of items) {
        const localId = await item.getLocalId();
        if (localId !== null) {
          allItems.push({ localId, category, data: null });
        }
      }
    }
    
    if (allItems.length === 0) {
      console.error(`No se encontraron elementos en las categorías especificadas`);
      return false;
    }
    
    // Agrupar por lotes para obtener datos eficientemente
    const allLocalIds = allItems.map(item => item.localId);
    const BATCH_SIZE = 200;
    
    for (let i = 0; i < allLocalIds.length; i += BATCH_SIZE) {
      const batchIds = allLocalIds.slice(i, i + BATCH_SIZE);
      const itemsData = await model.getItemsData(batchIds, {
        attributesDefault: true, // Necesitamos datos completos para filtrar por propiedades
        attributes: [property] // Solicitamos específicamente la propiedad que buscamos
      });
      
      // Asociar datos con los elementos correspondientes
      for (let j = 0; j < batchIds.length; j++) {
        const index = allItems.findIndex(item => item.localId === batchIds[j]);
        if (index !== -1) {
          allItems[index].data = itemsData[j];
        }
      }
    }
    
    // Filtrar elementos por la propiedad especificada
    const filteredItems = allItems.filter(item => {
      if (!item.data || !item.data[property]) return false;
      
      // Manejar el caso donde la propiedad es un objeto con estructura { value: ... }
      if (typeof item.data[property] === 'object' && 'value' in item.data[property]) {
        return item.data[property].value === value;
      }
      
      // Comparación directa
      return item.data[property] === value;
    }).slice(0, maxElements);
    
    // Extraer IDs de los elementos filtrados
    const filteredIds = filteredItems.map(item => item.localId);
    
    if (filteredIds.length === 0) {
      console.error(`No se encontraron elementos con la propiedad ${property} = ${value}`);
      return false;
    }
    
    // Usar la función de zoom a múltiples elementos
    return await zoomToElements(
      model,
      filteredIds,
      world,
      fragments,
      {
        zoomFactor,
        showBoundingBox,
        boundingBoxDuration,
        highlightElements,
        highlightColor,
        nonIsolatedOpacity,
        makeOthersTransparent
      }
    );
  } catch (error) {
    console.error(`Error en zoomToElementsByProperty:`, error);
    return false;
  }
}

/**
 * Restaurar la vista normal (quitar resaltado)
 */
export async function resetView(
  model: FRAGS.FragmentsModel,
  world: OBC.World,
  fragments: FRAGS.FragmentsModels,
  resetCamera: boolean = true
): Promise<boolean> {
  try {
    // Obtener todas las categorías del modelo
    const categories = await model.getCategories();
    
    // Resetear highlight para todos los elementos de todas las categorías
    for (const category of categories) {
      const items = await model.getItemsOfCategory(category);
      const localIds = (await Promise.all(
        items.map(item => item.getLocalId())
      )).filter(id => id !== null) as number[];
      
      if (localIds.length > 0) {
        await model.resetHighlight(localIds);
      }
    }
    
    // Actualizar fragmentos
    await fragments.update(true);
    
    // Resetear vista de cámara si se solicita
    if (resetCamera && world.camera && world.camera.controls) {
      world.camera.controls.reset();
    }
    
    return true;
  } catch (error) {
    console.error("Error al resetear vista:", error);
    return false;
  }
}

/**
 * Obtener información detallada de un elemento
 */
export async function getElementInfo(
  model: FRAGS.FragmentsModel,
  elementId: number
): Promise<{
  properties: any;
  boundingBox: THREE.Box3 | null;
  position: THREE.Vector3 | null;
}> {
  try {
    // Obtener datos del elemento
    const itemsData = await model.getItemsData([elementId], {
      attributesDefault: true, // Obtener todos los atributos disponibles
      attributes: ["*"]
    });
    
    const properties = itemsData && itemsData.length > 0 ? itemsData[0] : null;
    
    // Obtener caja delimitadora
    const boxes = await model.getBoxes([elementId]);
    const boundingBox = boxes && boxes.length > 0 ? boxes[0] : null;
    
    // Determinar posición central si hay boundingBox
    let position: THREE.Vector3 | null = null;
    if (boundingBox) {
      position = new THREE.Vector3();
      boundingBox.getCenter(position);
    }
    
    return { properties, boundingBox, position };
  } catch (error) {
    console.error(`Error al obtener información del elemento ${elementId}:`, error);
    return {
      properties: null,
      boundingBox: null,
      position: null
    };
  }
}

/**
 * Obtener dimensiones de un elemento
 */
export async function getElementDimensions(
  model: FRAGS.FragmentsModel,
  elementId: number
): Promise<{
  width: number;
  height: number;
  depth: number;
  volume: number;
} | null> {
  try {
    // Obtener caja delimitadora
    const boxes = await model.getBoxes([elementId]);
    if (!boxes || boxes.length === 0) return null;
    
    const box = boxes[0];
    
    // Calcular dimensiones
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Calcular volumen
    const volume = size.x * size.y * size.z;
    
    return {
      width: size.x,
      height: size.y,
      depth: size.z,
      volume
    };
  } catch (error) {
    console.error(`Error al obtener dimensiones del elemento ${elementId}:`, error);
    return null;
  }
}

// -------------------- FUNCIONES AUXILIARES INTERNAS --------------------

/**
 * Aplicar material semitransparente a todos los elementos
 */
async function makeAllElementsTransparent(
  model: FRAGS.FragmentsModel,
  material: FRAGS.MaterialDefinition
): Promise<void> {
  try {
    // Obtener todas las categorías del modelo
    const categories = await model.getCategories();
    
    // Procesar cada categoría
    for (const category of categories) {
      // Obtener elementos de esta categoría
      const items = await model.getItemsOfCategory(category);
      const localIds = (await Promise.all(
        items.map(item => item.getLocalId())
      )).filter(id => id !== null) as number[];
      
      if (localIds.length > 0) {
        // Aplicar material semitransparente
        await model.highlight(localIds, material);
      }
    }
  } catch (error) {
    console.error("Error al hacer transparentes todos los elementos:", error);
  }
}

/**
 * Hacer zoom a una caja delimitadora
 */
async function zoomToBox(
  world: OBC.World,
  box: THREE.Box3,
  zoomFactor: number = 2.0
): Promise<void> {
  if (!world.camera || !world.camera.controls) return;
  
  try {
    // Calcular esfera que contiene la caja
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    
    // Ajustar radio según el factor de zoom (menor = más cerca)
    sphere.radius = sphere.radius / zoomFactor;
    
    // Hacer zoom con controles
    await world.camera.controls.fitToSphere(sphere, true);
  } catch (error) {
    console.error("Error al hacer zoom a caja:", error);
  }
}

/**
 * Verificar si un elemento existe
 */
export async function elementExists(
  model: FRAGS.FragmentsModel,
  elementId: number
): Promise<boolean> {
  try {
    // Intentar obtener información del elemento
    const itemsData = await model.getItemsData([elementId], {
      attributesDefault: false,
      attributes: ["Name"] // Solo pedimos un atributo para minimizar el overhead
    });
    
    return itemsData && itemsData.length > 0 && itemsData[0] !== null;
  } catch (error) {
    console.error(`Error al verificar existencia del elemento ${elementId}:`, error);
    return false;
  }
}

/**
 * Crear un helper de bounding box para un elemento
 */
export function createBoundingBoxHelper(
  world: OBC.World,
  box: THREE.Box3,
  color: THREE.Color = new THREE.Color(0xffaa00),
  duration: number = 5000 // Duración en ms, 0 para permanente
): THREE.Box3Helper | null {
  if (!world.scene || !world.scene.three) return null;
  
  try {
    // Crear helper
    const boxHelper = new THREE.Box3Helper(box, color);
    
    // Añadir a la escena
    world.scene.three.add(boxHelper);
    
    // Configurar eliminación automática si se especifica duración
    if (duration > 0) {
      setTimeout(() => {
        if (boxHelper.parent) {
          boxHelper.parent.remove(boxHelper);
        }
      }, duration);
    }
    
    return boxHelper;
  } catch (error) {
    console.error("Error al crear helper de bounding box:", error);
    return null;
  }
}