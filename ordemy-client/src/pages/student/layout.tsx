import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Bell,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquareText,
  ReceiptText,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useChatUnreadCount } from "../../hooks/use-chat-unread-count";
import { UserAvatar } from "../../components/user-avatar";

const links = [
  { label: "Home", to: "/dashboard/student", icon: LayoutDashboard, end: true },
  { label: "Ask your adviser", to: "/dashboard/student/chat", icon: MessageCircle },
  { label: "My Questions", to: "/dashboard/student/questions", icon: MessageSquareText },
  { label: "Class rep", to: "/dashboard/student/classrep", icon: UsersRound },
  { label: "Curriculum", to: "/dashboard/student/curriculum", icon: BookOpen },
  { label: "Payment history", to: "/dashboard/student/payments", icon: ReceiptText },
  { label: "Settings", to: "/dashboard/student/settings", icon: SlidersHorizontal },
  { label: "Profile", to: "/dashboard/student/profile", icon: UserRound },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = useChatUnreadCount(user?.id);
  const currentPage =
    links.find((link) =>
      link.end
        ? location.pathname === link.to
        : location.pathname.startsWith(link.to),
    )?.label ?? "Student workspace";
  const isAdviserChat = location.pathname === "/dashboard/student/chat";

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  const unreadBadge = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <div className="font-['Poppins',sans-serif] min-h-screen bg-white text-[#0B1030]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-[#F0ECFF] bg-white px-5 py-7 lg:flex">
          <NavLink to="/dashboard/student" className="px-3">
            <img src="/ordemylogo.svg" alt="Oredemy" className="h-auto w-40 object-contain" />
          </NavLink>
          <span className="ml-3 mt-3 w-fit rounded-full bg-[#F1EDFF] px-3 py-1 text-[11px] font-semibold text-[#2501FF]">
            Student
          </span>

          <nav className="mt-10 space-y-1">
            {links.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[#2501FF]/[0.07] text-[#2501FF]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.8} />
                <span className="flex-1">{label}</span>
                {label === "Ask your adviser" && unreadCount > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadBadge}
                  </span>
                )}
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

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <aside
              id="student-mobile-menu"
              aria-label="Student navigation menu"
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
                      `flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                        isActive ? "bg-[#2501FF]/[0.07] text-[#2501FF]" : "text-slate-600 hover:bg-slate-50"
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span className="flex-1">{label}</span>
                    {label === "Ask your adviser" && unreadCount > 0 && (
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
          <header className="sticky top-0 z-10 border-b border-[#F0ECFF] bg-white px-3 py-3 sm:px-7 sm:py-4 lg:px-10">
            <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <NavLink to="/dashboard/student" className="lg:hidden">
                  <img src="/ordemylogo.svg" alt="Oredemy home" className="h-auto w-28 object-contain" />
                </NavLink>
                <div>
                  <p className="hidden text-sm font-bold text-slate-900 lg:block">{currentPage}</p>
                  <p className="hidden text-xs text-slate-400 sm:block">
                    Your academic support, all in one place
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <NavLink
                  to="/dashboard/student/chat"
                  aria-label={`${unreadCount} unread messages`}
                  className="relative grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-[#2501FF]"
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="absolute right-0 top-0 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {unreadBadge}
                    </span>
                  )}
                </NavLink>
                <div className="hidden max-w-[180px] text-right sm:block">
                  <p className="truncate text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="truncate text-[11px] text-slate-400">Student</p>
                </div>
                <UserAvatar image={user?.image} name={user?.name} className="size-9 text-sm" />
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                  aria-controls={menuOpen ? "student-mobile-menu" : undefined}
                  className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
                >
                  <Menu size={19} />
                </button>
              </div>
            </div>
          </header>
          <div
            className={`mx-auto max-w-[1260px] px-3 sm:px-7 lg:px-10 ${
              isAdviserChat
                ? "h-[calc(100dvh-64px)] overflow-hidden py-2 sm:h-[calc(100dvh-72px)] sm:py-3 lg:py-3"
                : "py-4 sm:py-8 lg:py-10"
            }`}
          >
            {!isAdviserChat && (
              <p className="mb-3 flex items-center gap-1 text-[11px] font-medium text-slate-500 sm:mb-4 sm:text-xs lg:hidden">
                Student <ChevronRight size={13} /> <span className="font-bold text-slate-800">{currentPage}</span>
              </p>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
