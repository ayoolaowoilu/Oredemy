import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api";
import type { PendingLecturer } from "../../utils/types";
import { fetchPendingLecturers, setLecturerVerification } from "./api";

const stats = [
  { label: "Users", value: "7", tone: "text-[#2501FF]" },
  { label: "Active students", value: "3", tone: "text-emerald-600" },
  { label: "Revenue", value: "₦1000", tone: "text-amber-500" },
  { label: "Complaints", value: "127", tone: "text-rose-500" },
  { label: "Support open", value: "0", tone: "text-amber-500" },
  { label: "App rating", value: "–", tone: "text-[#2501FF]" },
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
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1030] sm:text-[32px]">
          {waiting > 0
            ? `${waiting} approval${waiting === 1 ? "" : "s"} waiting`
            : "No approvals waiting"}
        </h1>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(({ label, value, tone }) => (
            <div
              key={label}
              className="rounded-3xl border border-[#F0ECFF] bg-white p-6"
            >
              <p className="text-xs font-medium text-slate-400">{label}</p>
              <p className={`mt-2 text-[28px] font-extrabold leading-none ${tone}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[#0B1030]">Pending approvals</h2>
          <span className="text-xs font-semibold text-slate-400">
            {waiting} waiting
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-600">
            {error}
          </p>
        )}

        <div className="mt-4 rounded-3xl border border-[#F0ECFF] bg-white px-3 py-1 sm:px-5">
          {loading ? (
            <p className="px-2 py-6 text-sm text-slate-400">Loading approvals…</p>
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
        </div>
      </section>
    </div>
  );
}
