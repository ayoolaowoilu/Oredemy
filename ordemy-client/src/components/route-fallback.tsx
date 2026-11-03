import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { LoadingScreen } from "./loading-states";

/**
 * Catch-all route: nothing renders unprotected. Signed-out visitors go to
 * login; signed-in users go to "/" where Home routes them to their workspace.
 */
export function RouteFallback() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/" replace />;
}
