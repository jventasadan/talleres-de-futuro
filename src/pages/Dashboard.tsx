import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { RecentCalls } from "@/components/dashboard/RecentCalls";

const Dashboard = () => {
  return (
    <DashboardLayout title="Panel de control" subtitle="Resumen de tu taller hoy">
      <div className="space-y-6">
        <StatsCards />
        <div className="grid gap-6 lg:grid-cols-2">
          <UpcomingAppointments />
          <RecentCalls />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
