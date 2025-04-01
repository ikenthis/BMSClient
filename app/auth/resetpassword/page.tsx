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
      <div className=' h-screen flex items-center justify-center flex-col'>
        <input 
          type="number" 
          placeholder='Ingresa tu código'
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className='block w-[30%] mx-auto px-6 py-3 bg-gray-300 rounded-lg no-spinner outline-none'
        />
        <input 
          type="password" 
          placeholder='Ingresa tu Contraseña'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className='block w-[30%] mx-auto px-6 py-3 bg-gray-300 rounded-lg mb-4 mt-4 no-spinner outline-none'
        />

        <input 
          type="password" 
          placeholder='Confirma tu Contraseña'
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className='block w-[30%] mx-auto px-6 py-3 bg-gray-300 rounded-lg mb-4 mt-4 no-spinner outline-none'
        />
      <div className='flex items-center space-x-4 mt-4'>
        {!loading && <Button className='cursor-pointer' onClick={handleSubmit}>Reinicia tu Contraseña</Button>}
        {loading && (
            <Button> 
                <Loader className='animate-spin'/>
            </Button>
        )}
        <Button variant={'ghost'} className='cursor-pointer'>
            <Link href={'/auth/forgetpassword'}>Volver</Link>
        </Button>
      </div>
      </div>
    )
  }

export default ResetPassword
