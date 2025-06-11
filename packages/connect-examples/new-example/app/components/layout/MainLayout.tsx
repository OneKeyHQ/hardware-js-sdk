import { ReactNode } from "react";
import { SidebarProvider } from "../ui/sidebar";
import { AppSidebar } from "../app-sidebar";
import { SiteHeader } from "../site-header";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <SiteHeader />
          <main className="flex-1 p-4">
            <div className="mx-auto max-w-full">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
