"use client";
import React from 'react';
import useAuthProtection from '@/app/lib/useAuthProtection';
import { LogOut, Home } from 'lucide-react';
import { useAuth } from '@/app/lib/AuthContext';
import { Button } from '@/app/components/ui/button';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, user, logout } = useAuthProtection();

  if (isLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-950">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background/80 backdrop-blur-sm border-gray-800">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Welcome, {user?.username}</span>
          <Link href="/" passHref>
             <Button variant="ghost" size="icon">
                <Home className="w-4 h-4" />
                <span className="sr-only">Back to Studio</span>
             </Button>
          </Link>
          <Button variant="outline" size="icon" onClick={logout}>
            <LogOut className="w-4 h-4" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </header>
      <main className="p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
