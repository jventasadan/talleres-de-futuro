import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, User, Car } from "lucide-react";
import { ReceptionDialog } from "@/components/appointments/ReceptionDialog";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { useClients } from "@/hooks/useClients";
import { useAllAppointments } from "@/hooks/useAppointments";
import { useMechanics } from "@/hooks/useMechanics";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { findNearestAvailableSlot, hasMechanicAvailability } from "@/lib/appointment-utils";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  showRecepcionar?: boolean;
}

interface SearchResult {
  type: "client" | "appointment";
  id: string;
  label: string;
  sub: string;
  url: string;
}

export function DashboardLayout({ children, title, subtitle, showSearch = true, showRecepcionar = true }: DashboardLayoutProps) {
  const [receptionOpen, setReceptionOpen] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<{ data: any; suggestedSlot: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const createMutation = useCreateAppointment();
  const { data: clients } = useClients();
  const { data: appointments } = useAllAppointments();
  const { data: mechanics } = useMechanics();
  const { data: companySettings } = useCompanySettings();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  const openingTime = companySettings?.opening_time?.trim() || "09:00";
  const closingTime = companySettings?.closing_time?.trim() || "18:00";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results: SearchResult[] = (() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const r: SearchResult[] = [];

    (clients ?? []).forEach((c) => {
      if (
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.license_plate ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q)
      ) {
        r.push({
          type: "client",
          id: c.id,
          label: c.name || "Sin nombre",
          sub: [c.license_plate, c.brand, c.model].filter(Boolean).join(" · "),
          url: `/clients?plate=${encodeURIComponent(c.license_plate || "")}`,
        });
      }
    });

    (appointments ?? []).forEach((a) => {
      if (
        (a.client_name ?? "").toLowerCase().includes(q) ||
        (a.license_plate ?? "").toLowerCase().includes(q)
      ) {
        r.push({
          type: "appointment",
          id: a.id,
          label: `${a.client_name} · ${a.license_plate}`,
          sub: `${a.service} (${a.date})`,
          url: `/clients?plate=${encodeURIComponent(a.license_plate || "")}`,
        });
      }
    });

    return r.slice(0, 8);
  })();

  const confirmCreate = (data: any, timeSlot: string) => {
    createMutation.mutate({ ...data, time_slot: timeSlot }, {
      onSuccess: () => {
        setReceptionOpen(false);
        setPendingAppointment(null);
      },
    });
  };

  const handleCreate = (data: any) => {
    const requestedTime = data.time_slot || openingTime;
    const mechanicCount = (mechanics ?? []).length || 1;

    if (data.date && data.service) {
      const hasAvailability = hasMechanicAvailability({
        appointments: appointments ?? [],
        date: data.date,
        requestedTime,
        serviceName: data.service || "",
        mechanicCount,
        openingTime,
        closingTime,
      });

      if (!hasAvailability) {
        const availableSlot = findNearestAvailableSlot({
          appointments: appointments ?? [],
          date: data.date,
          requestedTime,
          serviceName: data.service || "",
          mechanicCount,
          openingTime,
          closingTime,
        });

        if (!availableSlot) {
          toast.error("No hay huecos disponibles en esta fecha. Todos los mecánicos están ocupados.");
          return;
        }

        setPendingAppointment({ data, suggestedSlot: availableSlot });
        return;
      }
    }

    confirmCreate(data, requestedTime);
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    navigate(result.url);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 sm:gap-4 border-b border-border/50 bg-background/80 px-3 sm:px-6 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1 sm:-ml-2" />
            {showSearch && (
              <div className="relative flex-1 max-w-md" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, matrícula..."
                  className="pl-9 bg-secondary border-border/50"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => searchQuery && setShowResults(true)}
                />
                {showResults && results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg z-50 max-h-64 overflow-y-auto">
                    {results.map((r) => (
                      <button
                        key={`${r.type}-${r.id}`}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors text-sm"
                        onClick={() => handleResultClick(r)}
                      >
                        {r.type === "client" ? (
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1" />
            {showRecepcionar && (
              <Button
                onClick={() => setReceptionOpen(true)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-2 sm:px-4"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Recepcionar Vehículo</span>
              </Button>
            )}
          </header>
          <main className="flex-1 p-3 sm:p-6 animate-fade-in">{children}</main>
        </div>
      </div>

      <ReceptionDialog
        open={receptionOpen}
        onOpenChange={setReceptionOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      <AlertDialog open={!!pendingAppointment} onOpenChange={(open) => !open && setPendingAppointment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Horario no disponible</AlertDialogTitle>
            <AlertDialogDescription>
              La hora solicitada está ocupada (todos los mecánicos tienen citas).
              El hueco libre más cercano es a las <strong>{pendingAppointment?.suggestedSlot}</strong>.
              ¿Deseas agendar la cita a esa hora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => {
                if (pendingAppointment) {
                  confirmCreate(pendingAppointment.data, pendingAppointment.suggestedSlot);
                }
              }}
            >
              Aceptar ({pendingAppointment?.suggestedSlot})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
