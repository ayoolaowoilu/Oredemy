import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { ApiError } from "../../lib/api";
import { UserAvatar } from "../../components/user-avatar";
import {
  fetchAdminUsers,
  setLecturerVerification,
  type AdminUser,
} from "./api";
import {
  Card,
  EmptyState,
  Notice,
  PageIntro,
  StatCard,
} from "./shared";

const roleFilters = [
  { key: "all", label: "All users" },
  { key: "student", label: "Students" },
  { key: "lecturer", label: "Advisers" },
  { key: "admin", label: "Admins" },
] as const;

type RoleFilter = (typeof roleFilters)[number]["key"];

const roleStyle: Record<AdminUser["role"], string> = {
  student: "bg-blue-50 text-blue-700",
  lecturer: "bg-violet-50 text-violet-700",
  admin: "bg-amber-50 text-amber-700",
};

const roleLabel: Record<AdminUser["role"], string> = {
  student: "Student",
  lecturer: "Adviser",
  admin: "Admin",
};

const demoUsers: AdminUser[] = [
  {
    id: "__demo_amina",
    name: "Amina Yusuf",
    email: "amina@example.com",
    role: "student",
    is_verified: 1,
    session: "2024/2025",
    admission_session: "2024/2025",
    faculty_id: 1,
    department_id: 1,
    faculty: "Faculty of Science",
    department: "Computer Science",
    school: "University of Lagos",
    created_at: "2026-09-12T10:00:00.000Z",
  },
  {
    id: "__demo_chidi",
    name: "Chidi Okonkwo",
    email: "chidi@example.com",
    role: "student",
    is_verified: 1,
    session: "2023/2024",
    admission_session: "2023/2024",
    faculty_id: 2,
    department_id: 4,
    faculty: "Faculty of Engineering",
    department: "Mechanical Engineering",
    school: "University of Lagos",
    created_at: "2026-09-10T09:30:00.000Z",
  },
  {
    id: "__demo_bello",
    name: "Dr. Bello",
    email: "bello@example.com",
    role: "lecturer",
    is_verified: 0,
    session: "2024/2025",
    admission_session: null,
    faculty_id: 1,
    department_id: 1,
    faculty: "Faculty of Science",
    department: "Computer Science",
    school: "University of Lagos",
    created_at: "2026-10-01T08:15:00.000Z",
  },
  {
    id: "__demo_admin",
    name: "Super admin",
    email: "admin@oredemy.app",
    role: "admin",
    is_verified: 1,
    session: null,
    admission_session: null,
    faculty_id: null,
    department_id: null,
    faculty: null,
    department: null,
    school: null,
    created_at: "2026-08-01T07:00:00.000Z",
  },
];

const isDemo = (user: AdminUser) => user.id.startsWith("__demo_");

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminUsers();
      setUsers(
        response.data.length === 0 && import.meta.env.DEV
          ? demoUsers
          : response.data,
      );
    } catch (loadError: unknown) {
      if (import.meta.env.DEV) {
        setUsers(demoUsers);
      } else {
        setError(
          loadError instanceof ApiError || loadError instanceof Error
            ? loadError.message
            : "Could not load the user directory.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchAdminUsers()
      .then((response) => {
        if (!active) return;
        if (response.data.length === 0 && import.meta.env.DEV) {
          setUsers(demoUsers);
        } else {
          setUsers(response.data);
        }
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        if (import.meta.env.DEV) {
          setUsers(demoUsers);
          return;
        }
        setError(
          loadError instanceof ApiError || loadError instanceof Error
            ? loadError.message
            : "Could not load the user directory.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const byRole = filter === "all" || user.role === filter;
      const byQuery =
        !needle ||
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        (user.department ?? "").toLowerCase().includes(needle) ||
        (user.school ?? "").toLowerCase().includes(needle);
      return byRole && byQuery;
    });
  }, [filter, query, users]);

  const students = users.filter((user) => user.role === "student").length;
  const advisers = users.filter((user) => user.role === "lecturer").length;
  const pendingAdvisers = users.filter(
    (user) => user.role === "lecturer" && !user.is_verified,
  ).length;

  async function approve(user: AdminUser) {
    setError("");
    setNotice("");
    if (isDemo(user)) {
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, is_verified: true } : item,
        ),
      );
      setNotice(`${user.name} is now verified as an adviser.`);
      return;
    }
    setBusyId(user.id);
    try {
      await setLecturerVerification(user.id, true);
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, is_verified: true } : item,
        ),
      );
      setNotice(`${user.name} is now verified as an adviser.`);
    } catch (approveError: unknown) {
      setError(
        approveError instanceof ApiError || approveError instanceof Error
          ? approveError.message
          : "Could not verify this adviser.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="People"
        title="Users"
        description="See every account in Oredemy and verify advisers before they can support students."
        action={
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF] disabled:opacity-50"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}
      {notice && (
        <Notice tone="success" onDismiss={() => setNotice("")}>
          {notice}
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users size={19} />}
          label="Total users"
          value={loading ? "—" : users.length}
          note="All registered accounts"
          color="bg-[#2501FF]/[0.08] text-[#2501FF]"
        />
        <StatCard
          icon={<GraduationCap size={20} />}
          label="Students"
          value={loading ? "—" : students}
          note="Learning on Oredemy"
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<BadgeCheck size={19} />}
          label="Advisers"
          value={loading ? "—" : advisers}
          note="Department support accounts"
          color="bg-violet-50 text-violet-700"
        />
        <StatCard
          icon={<ShieldCheck size={19} />}
          label="Pending verification"
          value={loading ? "—" : pendingAdvisers}
          note="Advisers awaiting approval"
          color="bg-amber-50 text-amber-700"
        />
      </div>

      <Card className="mt-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Directory
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#0B1030]">
              Registered accounts
            </h2>
          </div>
          <label className="relative block w-full max-w-xs">
            <span className="sr-only">Search users</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email or department…"
              className="w-full rounded-full border border-[#F0ECFF] bg-white py-2.5 pl-9 pr-4 text-sm text-[#0B1030] outline-none placeholder:text-slate-400 focus:border-[#2501FF] focus:ring-2 focus:ring-[#2501FF]/10"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {roleFilters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                filter === key
                  ? "bg-[#2501FF] text-white"
                  : "bg-[#F7F5FF] text-slate-500 hover:text-[#2501FF]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-5 space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : filtered.length ? (
          <ul className="mt-4 divide-y divide-[#F5F2FF]">
            {filtered.map((user) => {
              const verified = Boolean(user.is_verified);
              return (
                <li
                  key={user.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={user.name}
                      className="size-10 shrink-0 text-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-[#0B1030]">
                          {user.name}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${roleStyle[user.role]}`}
                        >
                          {roleLabel[user.role]}
                        </span>
                        {user.role === "lecturer" && (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              verified
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {verified ? "Verified" : "Pending"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {[user.email, user.department, user.school]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {user.session ? `Session ${user.session}` : "No session set"}
                        {" · "}
                        Joined{" "}
                        {user.created_at
                          ? new Intl.DateTimeFormat(undefined, {
                              dateStyle: "medium",
                            }).format(new Date(user.created_at))
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {user.role === "lecturer" && !verified && (
                    <button
                      type="button"
                      onClick={() => void approve(user)}
                      disabled={busyId === user.id}
                      className="shrink-0 self-start rounded-full bg-[#2501FF] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#1D01CC] disabled:opacity-60 sm:self-center"
                    >
                      {busyId === user.id ? "Verifying…" : "Verify adviser"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-5">
            <EmptyState
              icon={<UserRound size={20} />}
              title={users.length ? "No matching users" : "No users yet"}
              description={
                users.length
                  ? "Try a different role or search term."
                  : "Registered accounts will appear here."
              }
            />
          </div>
        )}
      </Card>
    </>
  );
}
