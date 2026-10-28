import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { UserRole } from "../types/auth";

export function ProtectedRoute({
  roles,
  verifiedLecturer = false,
}: {
  roles?: UserRole[];
  verifiedLecturer?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (verifiedLecturer && (user.role !== "lecturer" || !user.is_verified))
    return <Navigate to="/" replace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading…</p>;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}