import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  MessageCircle,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { UserAvatar } from "../../components/user-avatar";

const links = [
  { label: "Overview", to: "/dashboard/student", icon: LayoutDashboard, end: true },
  { label: "Questions", to: "/dashboard/student/questions", icon: MessageSquareText },
  { label: "Adviser chat", to: "/dashboard/student/chat", icon: MessageCircle },
  { label: "Class rep", to: "/dashboard/student/classrep", icon: UsersRound },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }
  const currentPage =
    links.find((link) =>
      link.end
        ? location.pathname === link.to
        : location.pathname.startsWith(link.to),
    )?.label ?? "Student space";

  return (
    <div className="student-dashboard min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
          <NavLink to="/dashboard/student" className="flex flex-col items-start gap-1 px-2">
            <img src="/ordemylogo.svg" alt="Oredemy" className="h-auto w-40 object-contain" />
            <span className="text-xs text-slate-400">Student space</span>
          </NavLink>

          <p className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Your workspace
          </p>
          <nav className="space-y-1">
            {links.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[#2501FF]/[0.07] text-[#2501FF]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-[#f4f2ff] p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-[#2501FF]">
              <MessageCircle size={18} />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-900">Need a hand?</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Chat with your department adviser.
            </p>
            <NavLink
              to="/dashboard/student/chat"
              className="mt-3 inline-flex text-xs font-bold text-[#2501FF] hover:underline"
            >
              Open adviser chat
            </NavLink>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={18} /> Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-7 lg:px-10">
            <div className="mx-auto flex max-w-[1260px] items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <NavLink to="/dashboard/student" className="lg:hidden">
                  <img src="/ordemylogo.svg" alt="Oredemy home" className="h-auto w-32 object-contain" />
                </NavLink>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {currentPage}
                  </p>
                  <p className="hidden text-xs text-slate-400 sm:block">
                    Your academic support, all in one place
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden max-w-[180px] text-right sm:block">
                  <p className="truncate text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {user?.department ?? "Student"}
                  </p>
                </div>
                <UserAvatar image={user?.image} name={user?.name} className="size-9 text-sm" />
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sign out"
                  className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 lg:hidden"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
            <nav className="mx-auto mt-3 flex max-w-[1260px] gap-1 overflow-x-auto lg:hidden">
              {links.map(({ label, to, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      isActive
                        ? "bg-[#2501FF]/10 text-[#2501FF]"
                        : "bg-slate-100 text-slate-600"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </header>
          <div className="mx-auto max-w-[1260px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
