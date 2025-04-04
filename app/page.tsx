"use client";

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RootState } from "@/store/store";
import { setAuthUser } from '@/store/authSlice';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { API_URL } from '@/server';
import axios from 'axios';
import { toast } from 'sonner';
import { Building, ArrowRight, ChevronRight, Menu, X, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logoutHandler = async() => { 
    try {
      await axios.post(`${API_URL}/users/logout`, {}, { withCredentials: true });
      dispatch(setAuthUser(null));
      toast.success('Logged out successfully');
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
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Navbar */}
      <header 
        className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="w-[90%] max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">IPCE</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <nav>
              <ul className="flex gap-6">
                <li><a href="#features" className="font-medium text-gray-700 hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#about" className="font-medium text-gray-700 hover:text-blue-600 transition-colors">About</a></li>
                <li><a href="#contact" className="font-medium text-gray-700 hover:text-blue-600 transition-colors">Contact</a></li>
              </ul>
            </nav>
            
            {!user ? (
              <div className="flex items-center gap-3">
                <Link href="/auth/login"> 
                  <Button variant="outline" 
                    className="cursor-pointer border-2 border-blue-500 text-blue-500 hover:bg-blue-50 transition-all duration-300 rounded-full px-6">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/auth/signup"> 
                  <Button 
                    className="cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 rounded-full px-6 shadow-md hover:shadow-lg">
                    Registrate
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Avatar className="cursor-pointer border-2 border-blue-200 hover:border-blue-400 transition-all ring-offset-2 ring-2 ring-transparent hover:ring-blue-200">
                    <AvatarFallback className="font-bold uppercase bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      {user.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.username}</span>
                    <span className="text-xs text-gray-500">
                      {user.isVerified ? (
                        <span className="flex items-center text-green-500">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center text-amber-500">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                          Not Verified
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                
                <Link href="/dashboard">
                  <Button 
                    className="cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 rounded-full flex items-center gap-1 shadow-md hover:shadow-lg">
                    Dashboard <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                
                <Button 
                  onClick={logoutHandler}
                  variant="ghost" 
                  size="icon"
                  className="cursor-pointer text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden block text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white absolute w-full shadow-lg">
            <div className="w-[90%] mx-auto py-4">
              <nav className="mb-6">
                <ul className="flex flex-col gap-4">
                  <li><a href="#features" className="font-medium text-gray-700 block py-2">Features</a></li>
                  <li><a href="#about" className="font-medium text-gray-700 block py-2">About</a></li>
                  <li><a href="#contact" className="font-medium text-gray-700 block py-2">Contact</a></li>
                </ul>
              </nav>
              
              {!user ? (
                <div className="flex flex-col gap-3">
                  <Link href="/auth/login" className="w-full"> 
                    <Button variant="outline" 
                      className="w-full cursor-pointer border-2 border-blue-500 text-blue-500 hover:bg-blue-50 transition-all duration-300 rounded-full">
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/auth/signup" className="w-full"> 
                    <Button 
                      className="w-full cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 rounded-full">
                      Registrate
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 py-2">
                    <Avatar className="cursor-pointer border-2 border-blue-200">
                      <AvatarFallback className="font-bold uppercase bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {user.username.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.username}</span>
                      <span className="text-xs text-gray-500">
                        {user.isVerified ? "Verified" : "Not Verified"}
                      </span>
                    </div>
                  </div>
                  
                  <Link href="/dashboard" className="w-full">
                    <Button className="w-full cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 rounded-full">
                      Dashboard
                    </Button>
                  </Link>
                  
                  <Button 
                    onClick={logoutHandler}
                    variant="outline" 
                    className="w-full cursor-pointer border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5 mr-2" /> Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-32">
          <div className="w-[90%] max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-10">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700 tracking-tight leading-tight"
              >
                Smart Building Management System
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl text-gray-600 max-w-3xl mb-10"
              >
                Revolutionize how you manage your building infrastructure with our state-of-the-art IPCE platform
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                  Get Started <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button variant="outline" size="lg" className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 text-lg px-8 py-6 rounded-full transition-all duration-300">
                  Learn More
                </Button>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="relative w-full h-64 md:h-96 lg:h-[500px] mt-10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-indigo-600/90 flex items-center justify-center">
                <Building className="w-20 h-20 text-white opacity-20" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-white text-xl md:text-3xl font-medium">Interactive Dashboard Preview</h3>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section - just a placeholder */}
        <section id="features" className="py-20 bg-white">
          <div className="w-[90%] max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Powerful Features</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Feature {i}</h3>
                  <p className="text-gray-600">A powerful feature that enhances your building management experience.</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="w-[90%] max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">IPCE</h2>
              </div>
              <p className="text-gray-400 max-w-md">
                The most advanced building management system for modern infrastructure needs.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Product</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Company</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Security</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-gray-500 flex flex-col md:flex-row justify-between items-center">
            <p>© 2025 IPCE Building Management. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;