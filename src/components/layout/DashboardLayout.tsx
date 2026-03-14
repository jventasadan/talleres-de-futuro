import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, User, Car } from "lucide-react";
import { ReceptionDialog } from "@/components/appointments/ReceptionDialog";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { useClients } from "@/hooks/useClients";
import { useAllAppointments } from "@/hooks/useAppointments";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const createMutation = useCreateAppointment();
  const { data: clients } = useClients();
  const { data: appointments } = useAllAppointments();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

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
          sub: c.license_plate || "",
          url: `/clients?search=${encodeURIComponent(c.name || c.license_plate)}`,
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
          url: "/appointments",
        });
      }
    });

    return r.slice(0, 8);
  })();

  const handleCreate = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => setReceptionOpen(false),
    });
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
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 px-6 backdrop-blur-sm">
            <SidebarTrigger className="-ml-2" />
            {showSearch && (
              <div className="relative flex-1 max-w-md" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, matrícula, orden..."
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
