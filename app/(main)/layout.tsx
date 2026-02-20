"use client";
import React, { useState } from 'react';
import useAuthProtection from '@/app/lib/useAuthProtection';
import ChatSidebar from './_components/ChatSidebar';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export default function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuthProtection();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (isLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen bg-background">Loading Studio...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <ChatSidebar isOpen={isSidebarOpen} />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center h-14 px-4 border-b shrink-0 bg-background/80 backdrop-blur-sm">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4">
            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </Button>
          <div className="flex-1">
            {/* Can be used for current chat title */}
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
