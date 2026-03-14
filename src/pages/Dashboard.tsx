import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { RecentClients } from "@/components/dashboard/RecentClients";
import { MechanicWorkloadPanel } from "@/components/dashboard/MechanicWorkloadPanel";

const Dashboard = () => {
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardLayout title="Dashboard" subtitle={`Hoy, ${today}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Resumen General</h2>
          <p className="text-sm text-muted-foreground capitalize">Hoy, {today}</p>
        </div>

        <StatsCards />

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <UpcomingAppointments />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <RecentClients />
            <MechanicWorkloadPanel />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
