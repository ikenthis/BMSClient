"use client";
import { Button } from '@/components/ui/button';
import { API_URL } from '@/server';
import { setAuthUser } from '@/store/authSlice';
import axios from 'axios';
import { Loader } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

const ResetPassword = () => {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const router = useRouter();

    const handleSubmit = async () => {
        if (!otp || !email || !password || !passwordConfirm) {
            toast.error('Por favor ingresa todos los campos');
            return;
        }

        setLoading(true);

        try {
            const data = { email, otp, password, passwordConfirm };

            const response = await axios.post(`${API_URL}/users/resetpassword`, 
                data, 
                { withCredentials: true }
            );
            dispatch(setAuthUser(response.data.data.user));
            toast.success('Contraseña cambiada satisfactoriamente');
            router.push('/auth/login');
        } catch (error) {
            toast.error('Usuario no encontrado');
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#121827] text-white">
            {/* Header */}
            <header className="bg-[#121827] border-b border-[#2a3a5a]">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <h1 className="text-3xl font-bold text-blue-400">IPCE</h1>
                        <p className="text-xl text-gray-300">Smart Building Management System</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-12">
                <div className="max-w-md mx-auto bg-[#1e293b] rounded-xl shadow-lg overflow-hidden p-8 border border-[#2a3a5a]">
                    <h2 className="text-2xl font-semibold text-white mb-2">Restablecer Contraseña</h2>
                    <p className="text-gray-400 mb-8">Ingresa el código y tu nueva contraseña</p>
                    
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                                Código de verificación
                            </label>
                            <input
                                id="otp"
                                type="number"
                                placeholder="Ingresa tu código"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="block w-full bg-[#2a3a5a] border border-[#3b82f6] rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent no-spinner"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Nueva Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Ingresa tu Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full bg-[#2a3a5a] border border-[#3b82f6] rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-300 mb-2">
                                Confirmar Contraseña
                            </label>
                            <input
                                id="passwordConfirm"
                                type="password"
                                placeholder="Confirma tu Contraseña"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                className="block w-full bg-[#2a3a5a] border border-[#3b82f6] rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        
                        <div className="flex space-x-4 pt-2">
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer py-3"
                            >  
                                {loading ? (
                                    <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        Procesando...
                                    </>
                                ) : 'Reiniciar Contraseña'}
                            </Button>

                            <Button
                                variant="outline"
                                className="flex-1 border-blue-600 text-blue-400 hover:bg-blue-900/30 font-medium rounded-lg transition-colors py-3"
                                asChild
                            >
                                <Link href="/auth/forgetpassword">Volver</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#121827] border-t border-[#2a3a5a] mt-12">
                <div className="container mx-auto px-6 py-6">
                    <p className="text-center text-gray-400 text-sm">
                        © {new Date().getFullYear()} IPCE Smart Building Management System. Todos los derechos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default ResetPassword;