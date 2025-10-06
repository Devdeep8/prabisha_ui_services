import {AppSidebar} from '@/components/ui/app-sidebar';
import { SidebarProvider } from '@workspace/ui/components/sidebar';

export default function layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>

    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
    </SidebarProvider>
  );
}