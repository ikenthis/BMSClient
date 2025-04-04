"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React, { useState } from 'react';
import axios from 'axios';
import { Loader, Mail, Lock, Building, ArrowRight } from 'lucide-react';
import { API_URL } from '@/server';
import { useDispatch } from 'react-redux';
import { setAuthUser } from '@/store/authSlice'; 
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const Login = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData((formData) => ({
      ...formData,
      [name]: value
    }));
  };

  const submitHandler = async(e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/users/login`, formData, {withCredentials: true});

      const user = response.data.data.user;
      toast.success('Usuario conectado exitosamente');
      dispatch(setAuthUser(user)); 
      router.push('/');
      console.log(user);
    } 
    catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Ha ocurrido un error');
      }
      console.log(error);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-800"
        >
          <div className="p-8">
            {/* Logo/Header */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <Building className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-blue-400">IPCE</h1>
            </div>
            
            <h2 className="text-2xl font-semibold text-white text-center mb-2">Bienvenido de nuevo</h2>
            <p className="text-gray-400 text-center mb-8">Inicia sesión para acceder a tu cuenta</p>
            
            <form onSubmit={submitHandler}>
              <div className="mb-6">
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-200">
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input 
                    type="email" 
                    name="email" 
                    id="email"
                    placeholder="nombre@ejemplo.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-3 transition-all"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-200">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input 
                    type="password" 
                    name="password" 
                    id="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-3 transition-all"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end mb-6">
                <Link href="/auth/forgetpassword" className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              
              {!loading ? (
                <Button 
                  type="submit" 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-sm px-5 py-3 text-center shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Iniciar Sesión <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  disabled 
                  className="w-full bg-blue-500 text-white font-medium rounded-lg text-sm px-5 py-3 text-center opacity-80 flex items-center justify-center"
                >
                  <Loader className="mr-2 h-5 w-5 animate-spin" />
                  Procesando...
                </Button>
              )}
            </form>
            
            <div className="relative flex items-center justify-center mt-8 mb-4">
              <div className="w-full h-px bg-gray-700"></div>
              <span className="absolute bg-gray-900 px-4 text-sm text-gray-500">o</span>
            </div>
            
            <Button 
              variant="outline"
              className="w-full bg-transparent border-2 border-gray-700 text-gray-300 font-medium rounded-lg text-sm px-5 py-3 text-center mb-6 hover:bg-gray-800 transition-colors"
            >
              Continuar con Google
            </Button>
            
            <p className="text-center text-gray-400">
              ¿No tienes una cuenta?{' '}
              <Link href="/auth/signup">
                <span className="text-blue-400 font-semibold hover:text-blue-300 transition-colors cursor-pointer">
                  Regístrate aquí
                </span>
              </Link>
            </p>
          </div>
        </motion.div>
        
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2025 IPCE Gestión de Edificios. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;