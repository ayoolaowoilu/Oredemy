import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Home() {
  const { user, logout } = useAuth();

  if (user?.role === "student") {
    return <Navigate to="/dashboard/student" replace />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold text-slate-950">
        Welcome, {user?.name}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Your {user?.role ?? "account"} workspace is coming soon.
      </p>
      <button
        type="button"
        onClick={logout}
        className="mt-6 rounded-xl bg-[#2501FF] px-4 py-2.5 text-sm font-bold text-white"
      >
        Sign out
      </button>
    </main>
  );
}
