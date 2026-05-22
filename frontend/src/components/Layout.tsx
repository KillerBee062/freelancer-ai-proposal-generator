import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      {/* Gradient divider line */}
      <div className="w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-6xl animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
