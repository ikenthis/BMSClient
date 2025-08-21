import * as FRAGS from '@thatopen/fragments';
import {
  IfcSpecialty,
  IFC_CATEGORY_SPECIALTIES,
  toggleSpecialtyVisibility,
  getSpecialtyVisibilityState
} from '../utils/LayerVisibilityUtils';

export class LayerService {
  static async loadLayersVisibilityState(
    models: FRAGS.FragmentsModel[]
  ): Promise<Record<IfcSpecialty, boolean>> {
    const updatedVisibility: Record<IfcSpecialty, boolean> = {
      ARCHITECTURE: true,
      STRUCTURE: true,
      MEP: true,
      SITE: true
    };
    
    for (const specialty of Object.keys(IFC_CATEGORY_SPECIALTIES) as IfcSpecialty[]) {
      const isVisible = await getSpecialtyVisibilityState(models, specialty);
      updatedVisibility[specialty] = isVisible;
    }
    
    return updatedVisibility;
  }

  static async toggleLayerVisibility(
    specialty: IfcSpecialty,
    currentVisibility: boolean,
    models: FRAGS.FragmentsModel[],
    fragments: FRAGS.FragmentsModels
  ): Promise<boolean> {
    const newVisibility = !currentVisibility;
    
    await toggleSpecialtyVisibility(
      models,
      fragments,
      specialty,
      newVisibility
    );
    
    return newVisibility;
  }

  static async toggleAllLayers(
    layersVisibility: Record<IfcSpecialty, boolean>,
    showAll: boolean,
    models: FRAGS.FragmentsModel[],
    fragments: FRAGS.FragmentsModels
  ): Promise<Record<IfcSpecialty, boolean>> {
    const promises = [];
    const updatedVisibility: Record<IfcSpecialty, boolean> = {...layersVisibility};
    
    for (const specialty of Object.keys(layersVisibility) as IfcSpecialty[]) {
      if (layersVisibility[specialty] !== showAll) {
        promises.push(
          toggleSpecialtyVisibility(
            models,
            fragments,
            specialty,
            showAll
          )
        );
        updatedVisibility[specialty] = showAll;
      }
    }
    
    await Promise.all(promises);
    return updatedVisibility;
  }
}