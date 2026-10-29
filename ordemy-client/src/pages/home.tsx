import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  if (user?.role === "student") {
    return <Navigate to="/dashboard/student" replace />;
  }
  if (user?.role === "admin") {
    return <Navigate to="/dashboard/admin" replace />;
  }
  if (user?.role === "lecturer" && user.is_verified) {
    return <Navigate to="/dashboard/adviser" replace />;
  }
  if (user?.role === "lecturer" &&
      (!user.department_id || !user.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold text-slate-950">
        {user?.role === "lecturer" ? "Adviser account pending verification" : `Welcome, ${user?.name}`}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {user?.role === "lecturer"
          ? `Your assignment${user.department ? ` for ${user.department}` : ""} is awaiting verification. You'll be able to access the adviser workspace once an administrator approves it.`
          : `Your ${user?.role ?? "account"} workspace is coming soon.`}
      </p>
      <button
        type="button"
        onClick={signOut}
        className="mt-6 rounded-xl bg-[#2501FF] px-4 py-2.5 text-sm font-bold text-white"
      >
        Sign out
      </button>
    </main>
  );
}
