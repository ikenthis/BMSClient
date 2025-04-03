"use client";
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React, { useState } from 'react'
import axios from 'axios';
import { Loader } from 'lucide-react';
import { API_URL } from '@/server';
import { useDispatch } from 'react-redux';
import { setAuthUser } from '@/store/authSlice'; 
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const Signup = () => {

  const dispatch = useDispatch();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    passwordConfirm: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData((formData) => ({
      ...formData,
      [name]: value
    }));
  };

  const submitHandler = async(e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/users/signup`, formData, {withCredentials: true});

      const user = response.data.data.user;
      toast.success('Usuario creado satisfactoriamente');
      dispatch(setAuthUser(user)); 
      router.push('/auth/verify');
      console.log(user)

    } catch (error) {
      // Type guard to ensure error is AxiosError
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message);
      } else {
        toast.error('An error occurred');
      }
      console.log(error);
    }
    finally {
      setLoading(false);
    }
    console.log(formData);
  }

  return (
    <div className='flex items-center justify-center h-screen bg-gray-100'>
      <div className='shadow-md rounded-lg  w-[80%] sm:w-[350px] lg:w-[450px] p-8 bg-white'>
        <h1 className='text-center font-bold text-3xl mb-4 mt-4'>IPCE</h1>
        <form onSubmit={submitHandler}>
          <div className='mt-4'>
            <label htmlFor='username' className = "block mb-2  text-sm font-bold"> Username</label>
            <input 
              type="text" 
              name='username' 
              placeholder='Ingresa tu Username'
              value={formData.username}
              onChange={handleChange}
              className='py-2 bg-gray-200 rounded-md outline-none w-full'/>
          </div>
          <div className='mt-4'>
            <label htmlFor='email' className = "block mb-2  text-sm font-bold"> Email</label>
            <input 
              type="email" 
              name='email' 
              placeholder='Ingresa tu Email'
              value={formData.email}
              onChange={handleChange}
              className='py-2 bg-gray-200 rounded-md outline-none w-full'/>
          </div>
          <div className='mt-4'>
            <label htmlFor='password' className = "block mb-2  text-sm font-bold"> Password</label>
            <input 
              type="password" 
              name='password' 
              placeholder='Ingresa tu Password'
              value={formData.password}
              onChange={handleChange}
              className='py-2 bg-gray-200 rounded-md outline-none w-full'/>
          </div>
          <div className='mt-4'>
            <label htmlFor='passwordConfirm' className = "block mb-2  text-sm font-bold"> Confirm Password</label>
            <input 
              type="password" 
              name='passwordConfirm' 
              placeholder='Confirma tu Password'
              value={formData.passwordConfirm}
              onChange={handleChange}
              className='py-2 bg-gray-200 rounded-md outline-none w-full'/>
          </div>
          {!loading && (<Button type='submit' className='mt-6 w-full'>Enviar</Button>)}
          {loading && (
          <Button className='mt-6 w-full' disabled>
            <Loader className='mr-2 h-4 w-4 animate-spin' />
          </Button>
        )}
        </form>
        <h1 className='mt-4 text-center'>¿Ya tienes una cuenta? 
          <Link href='/auth/login'> <span className='text-blue-600 cursor-pointer' > Login</span></Link>
        </h1>
      </div>
    </div>
  )
}

export default Signup