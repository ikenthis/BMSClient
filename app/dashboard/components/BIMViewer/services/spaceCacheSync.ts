// Módulo para sincronizar los servicios de espacios
// Este código se puede incluir en un archivo separado o añadir a CollectionsPanel.tsx

import artCollectionService from '../services/artCollectionService';
import spaceScheduleService from '../services/spaceScheduleService';
import { SpaceElement } from '../utils/typeDefs';

/**
 * Sincroniza la caché de espacios entre todos los servicios
 * @param spaces Lista de espacios para guardar en la caché
 */
export const syncSpacesCache = (spaces: SpaceElement[]) => {
  console.log('Sincronizando caché de espacios en todos los servicios:', spaces.length);
  
  // Registrar la cantidad de espacios con longName para depuración
  const spacesWithLongName = spaces.filter(space => 
    space.properties?.longName || space.longName
  );
  
  console.log(`Sincronizando ${spacesWithLongName.length} espacios con longName`);
  
  // Actualizar en artCollectionService
  if (artCollectionService && artCollectionService.setSpacesCache) {
    artCollectionService.setSpacesCache(spaces);
    console.log('Caché actualizada en artCollectionService');
  }
  
  // Actualizar en spaceScheduleService
  if (spaceScheduleService && spaceScheduleService.setSpacesCache) {
    spaceScheduleService.setSpacesCache(spaces);
    console.log('Caché actualizada en spaceScheduleService');
  }
  
  return spaces;
};

export default { syncSpacesCache };