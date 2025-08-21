// hooks/useFirebaseAuth.ts
import { useState, useEffect } from 'react';
import { 
  User, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useFirebaseAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  // Autenticación anónima automática
  const signInAnonymously = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const result = await signInAnonymously(auth);
      console.log('Usuario autenticado anónimamente:', result.user.uid);
      return result.user;
    } catch (error: any) {
      console.error('Error en autenticación anónima:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      throw error;
    }
  };

  // Cerrar sesión
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
      setAuthState(prev => ({ ...prev, error: error.message }));
    }
  };

  // Verificar si el usuario está autenticado
  const ensureAuth = async (): Promise<User> => {
    if (authState.user) {
      return authState.user;
    }
    
    return await signInAnonymously();
  };

  // Escuchar cambios en el estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState({
        user,
        loading: false,
        error: null
      });
      
      if (user) {
        console.log('Usuario autenticado:', user.uid);
      } else {
        console.log('Usuario no autenticado');
      }
    });

    return unsubscribe;
  }, []);

  // Auto-login anónimo al iniciar
  useEffect(() => {
    if (!authState.loading && !authState.user) {
      signInAnonymously().catch(console.error);
    }
  }, [authState.loading, authState.user]);

  return {
    ...authState,
    signInAnonymously,
    signOut,
    ensureAuth,
    isAuthenticated: !!authState.user
  };
};