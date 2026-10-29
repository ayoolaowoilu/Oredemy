import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, UsersRound, X } from "lucide-react";
import { ApiError } from "../../lib/api";
import type { ClassRepRequest } from "../../utils/types";
import {
  fetchPendingClassRepRequests,
  reviewClassRepRequest,
} from "./api";
import { AdviserCard, AdviserNotice, AdviserPageIntro } from "./shared";

export default function AdviserClassReps() {
  const [requests, setRequests] = useState<ClassRepRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    setError("");
    try {
      const result = await fetchPendingClassRepRequests();
      setRequests(result.data);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof ApiError || loadError instanceof Error
          ? loadError.message
          : "Could not load class-representative requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      await loadRequests();
    }
    void initialize();
  }, [loadRequests]);

  async function decide(id: number, status: "approved" | "rejected") {
    let note: string | undefined;
    if (status === "rejected") {
      const enteredNote = window.prompt("Optional note for the student:");
      if (enteredNote === null) return;
      note = enteredNote;
    }
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await reviewClassRepRequest(id, status, note);
      setRequests((current) => current.filter((request) => request.id !== id));
      setNotice(`Request ${status}.`);
    } catch (reviewError: unknown) {
      setError(
        reviewError instanceof ApiError || reviewError instanceof Error
          ? reviewError.message
          : "Could not review this request.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <AdviserPageIntro
        eyebrow="Department leadership"
        title="Class-rep requests"
        description="Review student applications for the current department and academic session."
        action={
          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF] disabled:opacity-50"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      {error && <AdviserNotice dismiss={() => setError("")}>{error}</AdviserNotice>}
      {notice && <AdviserNotice tone="success" dismiss={() => setNotice("")}>{notice}</AdviserNotice>}
      {loading && !requests.length ? (
        <div className="h-52 animate-pulse rounded-2xl bg-white shadow-sm" />
      ) : requests.length === 0 ? (
        <AdviserCard className="py-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#2501FF]/[0.08] text-[#2501FF]">
            <UsersRound size={22} />
          </span>
          <h2 className="mt-4 font-bold text-slate-950">No pending requests</h2>
          <p className="mt-2 text-sm text-slate-500">New applications will appear here.</p>
        </AdviserCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {requests.map((request) => (
            <AdviserCard key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-950">{request.student_name ?? "Student"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{request.department ?? "Your department"} · {request.session}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">Pending</span>
              </div>
              {request.message ? (
                <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{request.message}</p>
              ) : (
                <p className="mt-4 text-sm italic text-slate-400">No note provided by the student.</p>
              )}
              <p className="mt-4 text-xs text-slate-400">
                {request.created_at
                  ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.created_at))
                  : ""}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void decide(request.id, "rejected")}
                  className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF] disabled:opacity-50"
                >
                  <X size={15} /> Reject
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void decide(request.id, "approved")}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2501FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d00d6] disabled:opacity-50"
                >
                  <Check size={15} /> {busy === request.id ? "Saving…" : "Approve"}
                </button>
              </div>
            </AdviserCard>
          ))}
        </div>
      )}
    </>
  );
}
