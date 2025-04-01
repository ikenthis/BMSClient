"use client";

import { Button } from '@/components/ui/button';
import { API_URL } from '@/server'; // Changed from @/server to a more typical path
import axios from 'axios';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

const ForgetPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!email) {
            toast.error('Por favor ingresa tu email');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/users/forgetpassword`, 
                { email }, 
                { withCredentials: true }
            );
            toast.success('Email enviado satisfactoriamente');
            router.push(`/auth/resetpassword?email=${encodeURIComponent(email)}`);
        } catch (error) {
            toast.error('Usuario no encontrado');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='w-full h-screen flex items-center justify-center flex-col'>
            <h1 className='text-2xl text-gray-900 mb-4 font-medium'>Ingresa tu email y obten el código para cambiar de contraseña</h1>
            <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='Email' 
                className='block w-[40%] mb-4 mx-auto rounded-lg bg-gray-100 border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className='px-6 cursor-pointer'
            >  
                {loading ? (
                    <>
                        <Loader className='mr-2 h-4 w-4 animate-spin' />
                        Enviando...
                    </>
                ) : 'Enviar'}
            </Button>
        </div>
    );
};

export default ForgetPassword;