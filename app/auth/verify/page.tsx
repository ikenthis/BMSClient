"use client";
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL } from '@/server';
import { Loader } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthUser } from '@/store/authSlice';
import { useRouter } from 'next/navigation';
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

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.target;
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

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message);
      } else {
        toast.error('An error occurred');
      }
      console.log(error);
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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message);
      } else {
        toast.error('An error occurred');
      }
      console.log(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121827]">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-[#3b82f6] mb-2">IPCE</h1>
        <h2 className="text-3xl text-white mb-6">Smart Building Management System</h2>
      </div>
      
      <div className="bg-[#1e293b] p-8 rounded-lg shadow-lg max-w-xl w-full">
        <h3 className="text-2xl mb-6 font-semibold text-center text-white">
          Ingresa los 6 digitos del código de verificación
        </h3>
        
        <div className="flex gap-2 md:gap-3 justify-center">
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
              className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-[#2a3a5a] text-2xl font-bold text-center text-white border border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6] focus:outline-none transition-all"
            />
          ))}
        </div>
        
        <div className="flex items-center justify-center gap-4 mt-8">
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white py-2 px-6 rounded-md transition-colors min-w-24 flex items-center justify-center"
          >
            {loading ? (
              <><Loader className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
            ) : (
              'Verify'
            )}
          </button>
          
          <button 
            onClick={handleResendOtp}
            disabled={loading}
            className="bg-transparent border border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white py-2 px-6 rounded-md transition-colors min-w-32"
          >
            Reenviar OTP
          </button>
        </div>
      </div>
      
      <div className="mt-6 flex gap-4">
        <a href="/auth/login" className="text-[#3b82f6] hover:underline">
          Iniciar Sesión
        </a>
        <a href="/auth/signup" className="text-[#3b82f6] hover:underline">
          Registrate
        </a>
      </div>
    </div>
  );
};

export default Verify;