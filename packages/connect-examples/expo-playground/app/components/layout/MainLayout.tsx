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
      <div className="flex h-[100dvh] min-w-0 w-full overflow-hidden bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-0 min-w-0">
          <SiteHeader />
          <main className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto">
            <div className="min-h-full min-w-0 p-2 sm:p-3">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
