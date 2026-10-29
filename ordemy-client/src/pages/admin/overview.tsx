import { useEffect, useState, type ReactNode } from "react";
import {
  Banknote,
  GraduationCap,
  Headphones,
  MessageSquareWarning,
  Star,
  Users,
} from "lucide-react";
import { ApiError } from "../../lib/api";
import type { PendingLecturer } from "../../utils/types";
import { fetchPendingLecturers, setLecturerVerification } from "./api";
import { Card, Notice, PageIntro, StatCard } from "./shared";

const stats: Array<{
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
  color: string;
}> = [
  {
    label: "Users",
    value: "7",
    note: "Registered accounts",
    icon: <Users size={19} />,
    color: "bg-[#2501FF]/[0.08] text-[#2501FF]",
  },
  {
    label: "Active students",
    value: "3",
    note: "Using the platform",
    icon: <GraduationCap size={20} />,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Revenue",
    value: "₦1000",
    note: "Settled this period",
    icon: <Banknote size={19} />,
    color: "bg-amber-50 text-amber-700",
  },
  {
    label: "Complaints",
    value: "127",
    note: "Awaiting review",
    icon: <MessageSquareWarning size={19} />,
    color: "bg-rose-50 text-rose-600",
  },
  {
    label: "Support open",
    value: "0",
    note: "No unread threads",
    icon: <Headphones size={19} />,
    color: "bg-amber-50 text-amber-700",
  },
  {
    label: "App rating",
    value: "–",
    note: "Collecting feedback",
    icon: <Star size={19} />,
    color: "bg-violet-50 text-violet-700",
  },
];

// Design preview rows used only in development when no real approvals exist yet.
const demoApprovals: PendingLecturer[] = [
  {
    id: "__demo_bello",
    name: "Dr. Bello",
    email: "bello@example.com",
    faculty_id: null,
    department_id: null,
    school: "OAU",
    created_at: "",
  },
  {
    id: "__demo_ogunleye",
    name: "Mrs. Ogunleye",
    email: "ogunleye@example.com",
    faculty_id: null,
    department_id: null,
    school: "OAU",
    created_at: "",
  },
];

const isDemo = (lecturer: PendingLecturer) => lecturer.id.startsWith("__demo_");

export default function AdminOverview() {
  const [pending, setPending] = useState<PendingLecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPendingLecturers()
      .then((response) => {
        if (!active) return;
        if (response.data.length === 0 && import.meta.env.DEV) {
          setPending(demoApprovals);
        } else {
          setPending(response.data);
        }
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        if (import.meta.env.DEV) {
          // Preview mode (no admin account yet): show the design rows.
          setPending(demoApprovals);
          return;
        }
        setError(
          loadError instanceof ApiError || loadError instanceof Error
            ? loadError.message
            : "Could not load pending approvals.",
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
    if (isDemo(lecturer)) {
      setPending((current) => current.filter((item) => item.id !== lecturer.id));
      return;
    }
    setBusyId(lecturer.id);
    try {
      await setLecturerVerification(lecturer.id, true);
      setPending((current) => current.filter((item) => item.id !== lecturer.id));
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

  function reject(lecturer: PendingLecturer) {
    // The API has no reject endpoint yet, so the row is dismissed locally.
    setPending((current) => current.filter((item) => item.id !== lecturer.id));
  }

  const waiting = pending.length;

  return (
    <>
      <PageIntro
        eyebrow="Admin overview"
        title={
          waiting > 0
            ? `${waiting} approval${waiting === 1 ? "" : "s"} waiting`
            : "No approvals waiting"
        }
        description="Review new adviser accounts and keep an eye on platform activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, note, icon, color }) => (
          <StatCard
            key={label}
            icon={icon}
            label={label}
            value={value}
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

        {error && (
          <div className="mt-4">
            <Notice onDismiss={() => setError("")}>{error}</Notice>
          </div>
        )}

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
                        {[lecturer.email, "adviser", lecturer.school]
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
                    <button
                      type="button"
                      onClick={() => reject(lecturer)}
                      disabled={busyId === lecturer.id}
                      className="rounded-full bg-[#FDE8EE] px-5 py-2 text-xs font-bold text-[#E11D48] transition hover:bg-[#FBD5DF] disabled:opacity-60"
                    >
                      Reject
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
