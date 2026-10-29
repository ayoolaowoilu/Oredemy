import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { calculateLevel, getCurrentAcademicSession } from "../../utils/level";

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const level = user
    ? calculateLevel(
        user.admission_session ?? user.session ?? "",
        getCurrentAcademicSession(user.calendar_offset ?? 0).label,
      )
    : null;
  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? "S";
  const subtitle = [
    level ? `Part ${level / 100}` : null,
    user?.department,
  ]
    .filter(Boolean)
    .join(" · ");

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="font-['Poppins',sans-serif] text-[#0B1030]">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-[32px]">
        Profile
      </h1>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section className="rounded-3xl border border-[#F0ECFF] bg-white p-8 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2501FF] text-4xl font-extrabold text-white sm:size-28">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name ? `${user.name} profile` : "Profile"}
                  className="size-full object-cover"
                />
              ) : (
                initial
              )}
            </span>
            <p className="mt-6 text-2xl font-extrabold sm:text-[28px]">
              {user?.name ?? "Student"}
            </p>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              {subtitle || "Student"}
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <Link
            to="/dashboard/student/settings"
            className="w-full rounded-2xl bg-[#F1EDFF] px-5 py-3.5 text-center text-sm font-semibold text-[#2501FF] transition-colors hover:bg-[#E9E5FF]"
          >
            Settings and Privacy
          </Link>
          <Link
            to="/terms"
            className="w-full rounded-2xl bg-[#F1EDFF] px-5 py-3.5 text-center text-sm font-semibold text-[#2501FF] transition-colors hover:bg-[#E9E5FF]"
          >
            Terms
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-2xl bg-[#2501FF] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D01CC]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
