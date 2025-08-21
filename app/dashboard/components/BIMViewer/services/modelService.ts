// modelService.ts - Service for interacting with BIM models
import { api } from './api';
import { ModelInfo } from '../utils/modelLoader'; // Adjust the import path as necessary

interface ElementFilter {
  category?: string;
  type?: string;
  property?: {
    name: string;
    value: any;
  };
}

class ModelService {
  /**
   * Get a list of all available models
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      return await api.getModels();
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  /**
   * Get a specific model by ID
   */
  async getModel(modelId: string): Promise<ModelInfo> {
    try {
      return await api.getModel(modelId);
    } catch (error) {
      console.error(`Error fetching model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get all categories for a model
   */
  async getCategories(modelId: string): Promise<string[]> {
    try {
      return await api.getCategories(modelId);
    } catch (error) {
      console.error(`Error fetching categories for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get elements for a model with optional filters
   */
  async getElements(modelId: string, filter?: ElementFilter): Promise<any[]> {
    try {
      const options: any = {};
      
      if (filter) {
        if (filter.category) {
          options.categories = [filter.category];
        }
        
        if (filter.type) {
          options.types = [filter.type];
        }
        
        if (filter.property) {
          options.properties = {
            [filter.property.name]: filter.property.value
          };
        }
      }
      
      return await api.getElements(modelId, options);
    } catch (error) {
      console.error(`Error fetching elements for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific element
   */
  async getElement(modelId: string, expressId: number): Promise<any> {
    try {
      return await api.getElement(modelId, expressId);
    } catch (error) {
      console.error(`Error fetching element ${expressId} for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Update element data (e.g., visibility, properties)
   */
  async updateElement(modelId: string, expressId: number, data: any): Promise<any> {
    try {
      return await api.updateElement(modelId, expressId, data);
    } catch (error) {
      console.error(`Error updating element ${expressId} for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Upload a new model
   */
  async uploadModel(file: File, metadata: Partial<ModelInfo>): Promise<ModelInfo> {
    try {
      return await api.uploadModel(file, metadata);
    } catch (error) {
      console.error('Error uploading model:', error);
      throw error;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelId: string): Promise<void> {
    try {
      await api.deleteModel(modelId);
    } catch (error) {
      console.error(`Error deleting model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Filter elements by property values
   */
  async filterElements(modelId: string, filters: Record<string, any>): Promise<any[]> {
    try {
      return await api.filterElements(modelId, filters);
    } catch (error) {
      console.error(`Error filtering elements for model ${modelId}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const modelService = new ModelService();