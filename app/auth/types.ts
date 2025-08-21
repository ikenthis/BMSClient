// types.ts

// Definición del usuario
export interface User {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'editor';
    photo?: string;
    createdAt?: string;
    active?: boolean;
  }
  
  // Tipo para las credenciales de login
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  // Tipo para la respuesta de login
  export interface AuthResponse {
    status: string;
    token: string;
    data: {
      user: User;
    };
  }
  
  // Tipo para la respuesta del modelo BIM
  export interface ModelInfo {
    _id: string;
    name: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    fileUrl: string;
    firebasePath?: string;
    uploadedBy?: string;
    storageType?: 'local' | 'firebase';
    createdAt?: string;
    updatedAt?: string;
  }
  
  // Tipo para la respuesta de carga a Firebase
  export interface UploadResponse {
    status: string;
    message: string;
    data: {
      model: ModelInfo;
      file: {
        url: string;
        path: string;
        size: number;
        type: string;
      }
    }
  }
  
  // Tipo para errores de la API
  export interface ApiError {
    status: string;
    message: string;
    error?: string;
    detail?: string;
  }