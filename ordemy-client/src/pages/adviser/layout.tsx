import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  CheckCheck,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useChatUnreadCount } from "../../hooks/use-chat-unread-count";
import { UserAvatar } from "../../components/user-avatar";

const links = [
  { label: "Overview", to: "/dashboard/adviser", icon: LayoutDashboard, end: true },
  { label: "AI review", to: "/dashboard/adviser/ai", icon: Bot },
  { label: "Class reps", to: "/dashboard/adviser/class-reps", icon: CheckCheck },
  { label: "Chats", to: "/dashboard/adviser/chat", icon: MessageCircle },
];

export default function AdviserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = useChatUnreadCount(user?.id);

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }
  const currentPage =
    links.find((link) =>
      link.end
        ? location.pathname === link.to
        : location.pathname.startsWith(link.to),
    )?.label ?? "Adviser workspace";

  const unreadBadge = unreadCount > 99 ? "99+" : unreadCount;

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
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[#2501FF]/[0.07] text-[#2501FF]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.8} />
                <span className="flex-1">{label}</span>
                {label === "Chats" && unreadCount > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadBadge}
                  </span>
                )}
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
            onClick={signOut}
            className="mt-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={18} /> Sign out
          </button>
        </aside>

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <aside
              className="flex h-full w-[min(84vw,340px)] flex-col bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <img src="/ordemylogo.svg" alt="Oredemy" className="h-auto w-36 object-contain" />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <UserAvatar image={user?.image} name={user?.name} className="size-11" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[user?.department, user?.session].filter(Boolean).join(" · ") || "Verified adviser"}
                  </p>
                </div>
              </div>
              <p className="mb-3 mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Department tools
              </p>
              <nav className="space-y-1">
                {links.map(({ label, to, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                        isActive ? "bg-[#2501FF]/[0.07] text-[#2501FF]" : "text-slate-600 hover:bg-slate-50"
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span className="flex-1">{label}</span>
                    {label === "Chats" && unreadCount > 0 && (
                      <span className="grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadBadge}
                      </span>
                    )}
                    <ChevronRight size={15} className="text-slate-300" />
                  </NavLink>
                ))}
              </nav>
              <button
                type="button"
                onClick={logout}
                className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                <LogOut size={18} /> Sign out
              </button>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-7 lg:px-10">
            <div className="mx-auto flex max-w-[1260px] items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open menu"
                  className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
                >
                  <Menu size={19} />
                </button>
                <img
                  src="/ordemylogo.svg"
                  alt="Oredemy"
                  className="h-auto w-32 object-contain lg:hidden"
                />
                <div>
                  <p className="hidden text-sm font-bold text-slate-900 lg:block">{currentPage}</p>
                  <p className="hidden text-xs text-slate-400 sm:block">
                    Department student support
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden max-w-[180px] text-right sm:block">
                  <p className="truncate text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {[user?.department, user?.session].filter(Boolean).join(" · ") || "Verified adviser"}
                  </p>
                </div>
                <UserAvatar image={user?.image} name={user?.name} className="size-9 text-sm" />
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-[1260px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
            <p className="mb-4 flex items-center gap-1 text-xs font-medium text-slate-500 lg:hidden">
              Adviser <ChevronRight size={13} /> <span className="font-bold text-slate-800">{currentPage}</span>
            </p>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
