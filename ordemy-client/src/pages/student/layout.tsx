import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquareText,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useChatUnreadCount } from "../../hooks/use-chat-unread-count";
import { UserAvatar } from "../../components/user-avatar";

const links = [
  { label: "Overview", to: "/dashboard/student", icon: LayoutDashboard, end: true },
  { label: "Questions", to: "/dashboard/student/questions", icon: MessageSquareText },
  { label: "Adviser chat", to: "/dashboard/student/chat", icon: MessageCircle },
  { label: "Class rep", to: "/dashboard/student/classrep", icon: UsersRound },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = useChatUnreadCount(user?.id);
  const currentPage =
    links.find((link) =>
      link.end
        ? location.pathname === link.to
        : location.pathname.startsWith(link.to),
    )?.label ?? "Student space";

  const unreadBadge = unreadCount > 99 ? "99+" : unreadCount;

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
                {label === "Adviser chat" && unreadCount > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadBadge}
                  </span>
                )}
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
            onClick={logout}
            className="mt-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={18} /> Sign out
          </button>
        </aside>

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
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
                  <p className="truncate text-xs text-slate-500">{user?.department ?? "Student"}</p>
                </div>
              </div>
              <p className="mb-3 mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Your workspace
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
                    {label === "Adviser chat" && unreadCount > 0 && (
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
                <NavLink to="/dashboard/student" className="lg:hidden">
                  <img src="/ordemylogo.svg" alt="Oredemy home" className="h-auto w-32 object-contain" />
                </NavLink>
                <div>
                  <p className="hidden text-sm font-bold text-slate-900 lg:block">{currentPage}</p>
                  <p className="flex items-center gap-1 text-[11px] font-medium text-slate-500 lg:hidden">
                    Student <ChevronRight size={12} /> <span className="font-bold text-slate-800">{currentPage}</span>
                  </p>
                  <p className="hidden text-xs text-slate-400 sm:block">
                    Your academic support, all in one place
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {user?.department ?? "Student"}
                  </p>
                </div>
                <UserAvatar image={user?.image} name={user?.name} className="size-9 text-sm" />
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
          </header>
          <div className="mx-auto max-w-[1260px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
