// Tipos para los modelos BIM
export interface BIMModel {
    _id: string;
    name: string;
    description?: string;
    fileUrl: string;
    fileType: string;
    uploadDate: string;
    lastModified: string;
    categories?: string[];
    metadata?: Record<string, any>;
  }
  
  // Tipos para las props de los componentes
  export interface BIMHubPageProps {
    onModelLoaded?: () => void;
    onItemSelected?: (item: any) => void;
  }
  
  export interface BIMHubUploaderProps {
    onUpload: (formData: FormData) => Promise<boolean>;
    isLoading: boolean;
  }
  
  export interface BIMHubModelListProps {
    models: BIMModel[];
    selectedModel: BIMModel | null;
    onSelect: (model: BIMModel) => void;
    onDelete: (modelId: string) => Promise<void>;
    isLoading: boolean;
  }
  
  export interface BIMHubDetailsProps {
    model: BIMModel | null;
  }
  
  // Tipo para el estado de carga de modelos
  export interface BIMHubState {
    models: BIMModel[];
    selectedModel: BIMModel | null;
    isLoading: boolean;
    error: string | null;
  }
  
  // Tipo para las opciones de configuración de la API
  export interface ApiConfig {
    baseURL: string;
    withCredentials: boolean;
  }

