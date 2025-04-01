"use client";
import { Button } from '@/components/ui/button';
import React, { ChangeEvent, KeyboardEvent, use, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL } from '@/server';
import { Loader } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setAuthUser } from '@/store/authSlice';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

const Verify = () => {
  const [otp, setOtp] = useState<string[]>(['','','','','','']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();

  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user) router.replace("/auth/signup"); 
  }, [user, router]);

  const handleChange = (
    index: number, 
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    const { value } = event.target;
    // Only accept single digit
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
  
    // Move to next input if value is entered
    if (value.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ): void => {
    if (
      event.key === 'Backspace' &&
      !otp[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async() => {
    setLoading(true);
    try {
      const otpValue = otp.join('');
      
      if (otpValue.length !== 6) {
        toast.error('Porfavor ingresa 6 digitos');
        setLoading(false);
        return;
      }
      
      const response = await axios.post(
        `${API_URL}/users/verify`, 
        {otp: otpValue}, 
        {withCredentials: true}
      );
      
      const verifiedUser = response.data.data.user;
      dispatch(setAuthUser(verifiedUser));
      toast.success('Verificación exitosa');
      router.push('/');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Verificaición fallida. Porfavor intenta de nuevo.';
      toast.error(errorMessage);
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async() => {
    try {
      await axios.post(
        `${API_URL}/users/resend-otp`, 
        {}, 
        {withCredentials: true}
      );
      toast.success('Nuevo OTP enviado satisfactoriamente');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Fallo al enviar el OTP. Porfavor intenta de nuevo.';
      toast.error(errorMessage);
    }
  };


  return (
    <div className='h-screen flex flex-col items-center justify-center bg-gray-50'>
      <div className='bg-white p-8 rounded-lg shadow-md max-w-xl w-full'>
        <h1 className='text-2xl mb-6 font-semibold text-center'>
          Ingresa los 6 digitos del código de verificación
        </h1>
        <div className='flex gap-2 md:gap-3 justify-center'>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <input 
              type="text" 
              inputMode="numeric"
              key={index} 
              maxLength={1}
              value={otp[index]} 
              onChange={(e) => handleChange(index, e)}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className='w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gray-100 text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all'
            />
          ))}
        </div>
        <div className='flex items-center justify-center gap-4 mt-8'>
          <Button 
            variant='default' 
            onClick={handleSubmit} 
            disabled={loading}
            className='min-w-24'
          >
            {loading ? (
              <><Loader className='mr-2 h-4 w-4 animate-spin' /> Verificando...</>
            ) : (
              'Verify'
            )}
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 transition-colors min-w-32"
            onClick={handleResendOtp}
            disabled={loading}
          >
            Reenvia OTP
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Verify;