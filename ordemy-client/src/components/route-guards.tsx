import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { UserRole } from "../types/auth";
import { needsOnboarding } from "../utils/onboarding";

export function ProtectedRoute({
  roles,
  verifiedLecturer = false,
}: {
  roles?: UserRole[];
  verifiedLecturer?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Dev-only: lets any account preview /dashboard/admin before an admin
  // account exists. This never applies to production builds.
  if (import.meta.env.DEV && roles?.includes("admin")) return <Outlet />;

  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (verifiedLecturer && (user.role !== "lecturer" || !user.is_verified))
    return <Navigate to="/" replace />;
  // Incomplete academic details: onboarding must be finished first.
  if (location.pathname !== "/onboarding" && needsOnboarding(user))
    return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading…</p>;
  if (user?.role === "lecturer" && user.is_verified) {
    return <Navigate to="/dashboard/adviser" replace />;
  }
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}