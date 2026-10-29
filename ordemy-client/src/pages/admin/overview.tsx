import { useEffect, useState } from "react";
import {
  BadgeCheck,
  GraduationCap,
  RefreshCw,
  School as SchoolIcon,
  Users,
} from "lucide-react";
import { ApiError } from "../../lib/api";
import type { Department, PendingLecturer, School } from "../../utils/types";
import {
  fetchAdminResource,
  fetchAdminUsers,
  fetchPendingLecturers,
  setLecturerVerification,
  type AdminUser,
} from "./api";
import { Card, Notice, PageIntro, StatCard } from "./shared";

export default function AdminOverview() {
  const [pending, setPending] = useState<PendingLecturer[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [pendingResponse, userResponse, schoolResponse, departmentResponse] =
        await Promise.all([
          fetchPendingLecturers(),
          fetchAdminUsers(),
          fetchAdminResource<School>("schools"),
          fetchAdminResource<Department>("departments"),
        ]);
      setPending(pendingResponse.data);
      setUsers(userResponse.data);
      setSchools(schoolResponse.data);
      setDepartments(departmentResponse.data);
    } catch (loadError: unknown) {
        setError(
          loadError instanceof ApiError || loadError instanceof Error
            ? loadError.message
            : "Could not load admin dashboard data.",
        );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchPendingLecturers(),
      fetchAdminUsers(),
      fetchAdminResource<School>("schools"),
      fetchAdminResource<Department>("departments"),
    ])
      .then(([pendingResponse, userResponse, schoolResponse, departmentResponse]) => {
        if (!active) return;
        setPending(pendingResponse.data);
        setUsers(userResponse.data);
        setSchools(schoolResponse.data);
        setDepartments(departmentResponse.data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof ApiError || loadError instanceof Error
            ? loadError.message
            : "Could not load admin dashboard data.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function approve(lecturer: PendingLecturer) {
    setError("");
    setNotice("");
    setBusyId(lecturer.id);
    try {
      await setLecturerVerification(lecturer.id, true);
      setPending((current) => current.filter((item) => item.id !== lecturer.id));
      setUsers((current) =>
        current.map((user) =>
          user.id === lecturer.id ? { ...user, is_verified: true } : user,
        ),
      );
      setNotice(`${lecturer.name} has been verified as an adviser.`);
    } catch (actionError: unknown) {
      setError(
        actionError instanceof ApiError || actionError instanceof Error
          ? actionError.message
          : "Could not approve this adviser.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const waiting = pending.length;
  const students = users.filter((user) => user.role === "student").length;
  const verifiedAdvisers = users.filter(
    (user) => user.role === "lecturer" && Boolean(user.is_verified),
  ).length;
  const stats = [
    {
      label: "Registered users",
      value: users.length,
      note: "All account types",
      icon: <Users size={19} />,
      color: "bg-[#2501FF]/[0.08] text-[#2501FF]",
    },
    {
      label: "Students",
      value: students,
      note: "Student accounts",
      icon: <GraduationCap size={20} />,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Verified advisers",
      value: verifiedAdvisers,
      note: `${waiting} awaiting verification`,
      icon: <BadgeCheck size={19} />,
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "Academic structure",
      value: schools.length,
      note: `${departments.length} departments`,
      icon: <SchoolIcon size={19} />,
      color: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <>
      <PageIntro
        eyebrow="Admin overview"
        title={
          waiting > 0
            ? `${waiting} approval${waiting === 1 ? "" : "s"} waiting`
            : "No approvals waiting"
        }
        description="Review adviser accounts and manage the academic structure using live platform data."
        action={
          <button
            type="button"
            onClick={() => void loadDashboard()}
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
        {stats.map(({ label, value, note, icon, color }) => (
          <StatCard
            key={label}
            icon={icon}
            label={label}
            value={loading ? "—" : value}
            note={note}
            color={color}
          />
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[#0B1030]">Pending approvals</h2>
          <span className="rounded-full bg-[#2501FF]/[0.08] px-3 py-1 text-xs font-bold text-[#2501FF]">
            {waiting} waiting
          </span>
        </div>

        <Card className="mt-4 px-3 py-1 sm:px-5" padded={false}>
          {loading ? (
            <div className="space-y-2 py-4">
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : pending.length === 0 ? (
            <p className="px-2 py-6 text-sm text-slate-400">
              New adviser accounts will appear here for approval.
            </p>
          ) : (
            <ul className="divide-y divide-[#F5F2FF]">
              {pending.map((lecturer) => (
                <li
                  key={lecturer.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F1EDFF] text-sm font-bold text-[#2501FF]">
                      {lecturer.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#0B1030]">
                        {lecturer.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {[
                          lecturer.email,
                          lecturer.department,
                          lecturer.session ? `Session ${lecturer.session}` : null,
                          lecturer.school,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => approve(lecturer)}
                      disabled={busyId === lecturer.id}
                      className="rounded-full bg-[#2501FF] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#1D01CC] disabled:opacity-60"
                    >
                      {busyId === lecturer.id ? "Approving…" : "Approve"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
