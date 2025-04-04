"use client";

import { Button } from '@/components/ui/button';
import { API_URL } from '@/server';
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
            toast.error('Please enter your email');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/users/forgetpassword`, 
                { email }, 
                { withCredentials: true }
            );
            toast.success('Email sent successfully');
            router.push(`/auth/resetpassword?email=${encodeURIComponent(email)}`);
        } catch (error) {
            toast.error('User not found');
            console.error(error);
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
                    <h2 className="text-2xl font-semibold text-white mb-2">Password Recovery</h2>
                    <p className="text-gray-400 mb-8">Enter your email to receive a password reset link</p>
                    
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="block w-full bg-[#2a3a5a] border border-[#3b82f6] rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer py-3"
                        >  
                            {loading ? (
                                <>
                                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : 'Send Reset Link'}
                        </Button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#2a3a5a]">
                        <p className="text-center text-gray-400">
                            Remember your password?{' '}
                            <button 
                                onClick={() => router.push('/auth/login')}
                                className="text-blue-400 hover:text-blue-300 font-medium"
                            >
                                Sign in
                            </button>
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#121827] border-t border-[#2a3a5a] mt-12">
                <div className="container mx-auto px-6 py-6">
                    <p className="text-center text-gray-400 text-sm">
                        © {new Date().getFullYear()} IPCE Smart Building Management System. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default ForgetPassword;