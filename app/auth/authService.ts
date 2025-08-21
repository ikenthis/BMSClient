// authService.ts
import axios from 'axios';
import { store } from '@/store/store'; // Asegúrate de que la ruta sea correcta
import { setAuthUser } from '@/store/authSlice'; // Asegúrate de que la ruta sea correcta
import { User } from './types';

// URL base para las peticiones de autenticación
const AUTH_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Interfaz para la respuesta del login
interface LoginResponse {
  status: string;
  token: string;
  data: {
    user: User;
  };
}

// Función para iniciar sesión
export const login = async (email: string, password: string) => {
  try {
    const response = await axios.post<LoginResponse>(`${AUTH_API_URL}/users/login`, {
      email,
      password
    });

    const { token, data } = response.data;

    // Guardar el token en localStorage
    localStorage.setItem('jwt', token);
    
    // Actualizar el estado de Redux con el usuario
    store.dispatch(setAuthUser(data.user));

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Función para cerrar sesión
export const logout = () => {
  // Eliminar el token del localStorage
  localStorage.removeItem('jwt');
  
  // Actualizar el estado de Redux
  store.dispatch(setAuthUser(null));
};

// Función para obtener el token JWT
export const getToken = (): string | null => {
  // Primero intentamos obtenerlo del localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwt');
  }
  return null;
};

// Función para verificar si el usuario está autenticado
export const isAuthenticated = (): boolean => {
  const token = getToken();
  return !!token;
};

// Configurar interceptor para incluir el token en todas las peticiones
axios.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);