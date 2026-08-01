import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '../ui/sidebar';
import { AppSidebar } from '../sidebar';
import { SiteHeader } from '../header';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-0">
          <SiteHeader />
          <main className="flex-1 min-h-0 overflow-auto">
            <div className="h-full p-3">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
