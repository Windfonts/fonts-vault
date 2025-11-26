import { ReactNode } from 'react';
import { AdminHeader } from './admin-header';
import { Sidebar } from './sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <Sidebar />
      <main className="ml-0 p-6 md:ml-64">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
