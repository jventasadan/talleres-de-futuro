import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkshopProvider } from "@/contexts/WorkshopContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import WeeklyCalendar from "./pages/WeeklyCalendar";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import Quotes from "./pages/Quotes";
import MechanicChat from "./pages/MechanicChat";
import CourtesyVehicles from "./pages/CourtesyVehicles";
import VehicleHistory from "./pages/VehicleHistory";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkshopProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
              <Route path="/weekly" element={<ProtectedRoute><WeeklyCalendar /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
              <Route path="/mechanic-ai" element={<ProtectedRoute><MechanicChat /></ProtectedRoute>} />
              <Route path="/courtesy-vehicles" element={<ProtectedRoute><CourtesyVehicles /></ProtectedRoute>} />
              <Route path="/vehicle-history" element={<ProtectedRoute><VehicleHistory /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WorkshopProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
