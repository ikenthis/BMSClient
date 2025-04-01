"use client";

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { RootState } from "@/store/store";
import { setAuthUser } from '@/store/authSlice';
import Link from 'next/link';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { API_URL } from '@/server';
import axios from 'axios';
import { toast } from 'sonner';

const HomePage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();

  const logoutHandler = async() => { 
    try {
      await axios.post(`${API_URL}/users/logout`, {}, { withCredentials: true });
      dispatch(setAuthUser(null));
      toast.success('Logged out successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Logout failed. Please try again.';
      toast.error(errorMessage);
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="h-[12vh] shadow-md">
      <div className="w-[80%] mx-auto flex items-center justify-between h-full">
        <h1 className="text-3xl font-bold">IPCE</h1>
        {!user && (
          <Link href="/auth/signup"> 
            <Button size="lg" className="cursor-pointer hover:bg-blue-700 transition-colors">
              Registrate
            </Button>
          </Link>
        )}

        {user && (
          <div className="flex items-center gap-4">
            <Avatar onClick={logoutHandler} className="cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarFallback className="font-bold uppercase bg-blue-600 text-white">
                {user.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <Link href="/dashboard">
              <Button className="cursor-pointer hover:bg-blue-700 transition-colors">
                Dashboard
              </Button>
            </Link>
            <Button 
              className="cursor-pointer" 
              variant="ghost" 
              size="sm"
            >
              {user.isVerified ? "Verified" : "Not Verified"}
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center h-[80vh]">
        <h1 className="text-5xl font-bold text-center">Welcome to IPCE Building Management System</h1>
      </div>
    </div>
  );
};

export default HomePage;