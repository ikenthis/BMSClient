export const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL
export const API_URL_BIM = process.env.NEXT_PUBLIC_BACKEND_URL_PROD
export const API_URL_INFO = process.env.NEXT_PUBLIC_BACKEND_URL_PROD2
export const API_BASE = process.env.NODE_ENV === 'development' 
export const API_COLLECTION = process.env.NEXT_PUBLIC_BACKEND_URL_COL
  ? 'http://localhost:4000' // URL del backend en desarrollo
 : '';