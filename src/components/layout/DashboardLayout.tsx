import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { ReceptionDialog } from "@/components/appointments/ReceptionDialog";
import { useCreateAppointment } from "@/hooks/useAppointments";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  showRecepcionar?: boolean;
}

export function DashboardLayout({ children, title, subtitle, showSearch = true, showRecepcionar = true }: DashboardLayoutProps) {
  const [receptionOpen, setReceptionOpen] = useState(false);
  const createMutation = useCreateAppointment();

  const handleCreate = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => setReceptionOpen(false),
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 px-6 backdrop-blur-sm">
            <SidebarTrigger className="-ml-2" />
            {showSearch && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, matrícula, orden... (Ej: 1234-BCD)"
                  className="pl-9 bg-secondary border-border/50"
                />
              </div>
            )}
            <div className="flex-1" />
            {showRecepcionar && (
              <Button
                onClick={() => setReceptionOpen(true)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
              >
                <Plus className="mr-2 h-4 w-4" />
                Recepcionar Vehículo
              </Button>
            )}
          </header>
          <main className="flex-1 p-6 animate-fade-in">{children}</main>
        </div>
      </div>

      <ReceptionDialog
        open={receptionOpen}
        onOpenChange={setReceptionOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />
    </SidebarProvider>
  );
}
