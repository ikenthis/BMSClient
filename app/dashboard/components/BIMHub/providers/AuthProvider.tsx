"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useFirebaseAuth, AuthState } from '../useFirebaseAuth';

interface AuthContextType extends AuthState {
  signInAnonymously: () => Promise<any>;
  signOut: () => Promise<void>;
  ensureAuth: () => Promise<any>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useFirebaseAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};