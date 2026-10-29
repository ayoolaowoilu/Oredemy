import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Banknote,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { UserAvatar } from "../../components/user-avatar";

const links = [
  { label: "Home", to: "/dashboard/admin", icon: LayoutDashboard, end: true },
  { label: "Users", to: "/dashboard/admin/users", icon: Users },
  { label: "Academics", to: "/dashboard/admin/academics", icon: GraduationCap },
  { label: "Money", to: "/dashboard/admin/money", icon: Banknote },
  { label: "More", to: "/dashboard/admin/more", icon: MoreHorizontal },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="font-['Poppins',sans-serif] min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-[#F0ECFF] bg-white px-5 py-7 lg:flex">
          <NavLink to="/dashboard/admin" className="px-3">
            <img src="/ordemylogo.svg" alt="Oredemy" className="h-auto w-40 object-contain" />
          </NavLink>
          <span className="ml-3 mt-3 w-fit rounded-full bg-[#F1EDFF] px-3 py-1 text-[11px] font-semibold text-[#2501FF]">
            Super admin
          </span>

          <nav className="mt-10 space-y-1">
            {links.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
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

          <p className="mt-auto px-3 text-xs leading-5 text-slate-400">
            Bridging the gap between students and advisers
          </p>

          <button
            type="button"
            onClick={signOut}
            className="mt-5 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={18} /> Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-[#F0ECFF] bg-white px-4 py-4 sm:px-7 lg:px-10">
            <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <NavLink to="/dashboard/admin" className="lg:hidden">
                  <img src="/ordemylogo.svg" alt="Oredemy" className="h-auto w-28 object-contain" />
                </NavLink>
                <p className="hidden text-sm text-slate-400 sm:block">
                  Oredemy <span className="mx-1.5 text-slate-300">/</span>
                  <span className="font-semibold text-slate-800">Super admin</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden max-w-[180px] text-right sm:block">
                  <p className="truncate text-sm font-bold text-slate-800">Super admin</p>
                  {user?.email && (
                    <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                  )}
                </div>
                <UserAvatar
                  image={user?.image}
                  name={user?.name ?? "Super admin"}
                  className="size-9 text-sm"
                />
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

            <nav className="mx-auto mt-3 flex max-w-[1180px] gap-1 overflow-x-auto lg:hidden">
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

          <div className="mx-auto max-w-[1180px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-11">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
