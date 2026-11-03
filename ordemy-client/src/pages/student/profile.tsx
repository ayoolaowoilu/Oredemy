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

      <div className="mt-5 grid gap-4 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5">
        <section className="rounded-2xl border border-[#F0ECFF] bg-white p-5 sm:rounded-3xl sm:p-8 lg:p-10">
          <div className="flex flex-col items-center text-center">
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2501FF] text-3xl font-extrabold text-white sm:size-28 sm:text-4xl">
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
            <p className="mt-4 break-words text-xl font-extrabold sm:mt-6 sm:text-[28px]">
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
            className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#F1EDFF] px-4 py-3 text-center text-sm font-semibold text-[#2501FF] transition-colors hover:bg-[#E9E5FF] sm:px-5 sm:py-3.5"
          >
            Settings and Privacy
          </Link>
          <Link
            to="/terms"
            className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#F1EDFF] px-4 py-3 text-center text-sm font-semibold text-[#2501FF] transition-colors hover:bg-[#E9E5FF] sm:px-5 sm:py-3.5"
          >
            Terms
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="min-h-11 w-full rounded-2xl bg-[#2501FF] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1D01CC] sm:px-5 sm:py-3.5"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
