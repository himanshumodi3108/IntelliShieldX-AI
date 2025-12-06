import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

/**
 * Route component that redirects authenticated users to dashboard
 * Only allows unauthenticated users to access the route
 */
export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Redirect authenticated users immediately, even during loading
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // This will be handled by the Navigate component below
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state only if we're not authenticated yet
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

