import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { RecentCalls } from "@/components/dashboard/RecentCalls";
import { RecentClients } from "@/components/dashboard/RecentClients";

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
        {/* Title */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Resumen General</h2>
          <p className="text-sm text-muted-foreground capitalize">
            Hoy, {today}
          </p>
        </div>

        {/* Stats */}
        <StatsCards />

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <UpcomingAppointments />
          </div>
          <div className="lg:col-span-2">
            <RecentClients />
          </div>
        </div>

        {/* Activity */}
        <RecentCalls />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
