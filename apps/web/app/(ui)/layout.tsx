import { AppSidebar } from "@/components/ui/app-sidebar";
import PrabishaHeader from "@/components/ui/main-header";
import { SidebarProvider } from "@workspace/ui/components/sidebar";

export default function layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <PrabishaHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            {/* Your page content goes here */}
            <div>{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
