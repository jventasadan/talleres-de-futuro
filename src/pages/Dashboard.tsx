import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { RecentCalls } from "@/components/dashboard/RecentCalls";
import { RecentClients } from "@/components/dashboard/RecentClients";
import { AIStatusWidget } from "@/components/dashboard/AIStatusWidget";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <DashboardLayout title="Panel de control" subtitle={`Hoy es ${today}`}>
      <div className="space-y-6">
        {/* Top bar: AI status + action button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 max-w-lg">
            <AIStatusWidget />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => navigate("/appointments")}>
              <Calendar className="mr-2 h-4 w-4" />
              Ver agenda
            </Button>
            <Button onClick={() => navigate("/appointments")}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva cita
            </Button>
          </div>
        </div>

        {/* Stats */}
        <StatsCards />

        {/* Main grid: Timeline + Calls */}
        <div className="grid gap-6 lg:grid-cols-2">
          <UpcomingAppointments />
          <RecentCalls />
        </div>

        {/* Clients */}
        <RecentClients />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
