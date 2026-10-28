import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bot,
  CheckCheck,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings2,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";

const links = [
  { label: "Overview", to: "/dashboard/adviser", icon: LayoutDashboard, end: true },
  { label: "AI review", to: "/dashboard/adviser/ai", icon: Bot },
  { label: "Class reps", to: "/dashboard/adviser/class-reps", icon: CheckCheck },
  { label: "Chats", to: "/dashboard/adviser/chat", icon: MessageCircle },
  { label: "AI settings", to: "/dashboard/adviser/settings", icon: Settings2 },
];

export default function AdviserLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const currentPage =
    links.find((link) =>
      link.end
        ? location.pathname === link.to
        : location.pathname.startsWith(link.to),
    )?.label ?? "Adviser workspace";

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
          <div className="flex flex-col items-start gap-1 px-2">
            <img src="/ordemylogo.svg" alt="Oredemy" className="h-auto w-40 object-contain" />
            <span className="text-xs text-slate-400">Adviser workspace</span>
          </div>
          <p className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Department tools
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
            <p className="text-sm font-bold text-slate-900">AI stays in review</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Nothing generated is sent to students until you approve it.
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={18} /> Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-7 lg:px-10">
            <div className="mx-auto flex max-w-[1260px] items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/ordemylogo.svg"
                  alt="Oredemy"
                  className="h-auto w-32 object-contain lg:hidden"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">{currentPage}</p>
                  <p className="hidden text-xs text-slate-400 sm:block">
                    Department student support
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {[user?.department, user?.session].filter(Boolean).join(" · ") || "Verified adviser"}
                  </p>
                </div>
                <span className="grid size-9 place-items-center rounded-full bg-[#2501FF]/10 text-sm font-bold text-[#2501FF]">
                  {user?.name?.trim().charAt(0).toUpperCase() ?? "A"}
                </span>
                <button
                  type="button"
                  onClick={logout}
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
