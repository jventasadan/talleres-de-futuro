import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkshop } from "@/contexts/WorkshopContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { workshopComplete, loading: workshopLoading } = useWorkshop();
  const location = useLocation();

  if (authLoading || workshopLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // If workshop data is incomplete, redirect to settings (unless already there)
  if (!workshopComplete && location.pathname !== "/settings") {
    return <Navigate to="/settings" replace />;
  }

  return <>{children}</>;
}
