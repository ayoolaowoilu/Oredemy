import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, RefreshCw, UsersRound, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import type { ClassRepRequest } from "../../utils/types";
import { fetchMyClassRepRequests, sendClassRepRequest } from "./api";
import { Card, Notice, PageIntro, PrimaryButton } from "./shared";

function requestStatusStyle(status: ClassRepRequest["status"]) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected" || status === "revoked") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

export default function StudentClassRep() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ClassRepRequest[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = useCallback(async () => {
    const response = await fetchMyClassRepRequests();
    setRequests(response.data);
  }, []);

  useEffect(() => {
    let active = true;
    fetchMyClassRepRequests()
      .then((response) => {
        if (active) setRequests(response.data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : "We couldn’t load your requests.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const newestRequest = requests[0];
  const activeRequest =
    newestRequest?.status === "pending" || newestRequest?.status === "approved";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await sendClassRepRequest(message.trim());
      setMessage("");
      await loadRequests();
      setSuccess("Your request was sent to your department for review.");
    } catch (requestError) {
      setError(
        requestError instanceof ApiError || requestError instanceof Error
          ? requestError.message
          : "Your request could not be sent.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}
      {success && (
        <Notice tone="success" onDismiss={() => setSuccess("")}>
          {success}
        </Notice>
      )}
      <PageIntro
        eyebrow="Get involved"
        title="Class representative"
        description="Put yourself forward to help your classmates stay informed and connected with your department."
        action={
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadRequests()
                .catch((refreshError: unknown) =>
                  setError(
                    refreshError instanceof Error
                      ? refreshError.message
                      : "Could not refresh requests.",
                  ),
                )
                .finally(() => setLoading(false));
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF]"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card>
          <span className="grid size-11 place-items-center rounded-xl bg-[#2501FF]/[0.08] text-[#2501FF]">
            <UsersRound size={20} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-950">
            Represent your class
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Your request will be sent to your department and linked to your
            current session.
          </p>

          <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Department
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {user?.department ?? "Not set"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Academic session
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {user?.session ?? "Not set"}
              </p>
            </div>
          </div>

          {activeRequest ? (
            <div className="mt-5 rounded-2xl border border-[#F0ECFF] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold capitalize text-slate-900">
                    Request {newestRequest.status}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {newestRequest.department ?? user?.department} ·{" "}
                    {newestRequest.session}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${requestStatusStyle(newestRequest.status)}`}
                >
                  {newestRequest.status}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {newestRequest.status === "approved"
                  ? "You’re approved to represent your class for this session."
                  : newestRequest.status === "revoked"
                    ? "Your class-representative authority was revoked. You can submit a new request if needed."
                    : newestRequest.status === "rejected"
                      ? "Your request was not approved. You can submit another request."
                      : "Your department has your request. You can check back later for updates."}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5">
              <label
                htmlFor="student-classrep-note"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                A note for your department{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="student-classrep-note"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Share why you’d like to help represent your class."
                className="w-full resize-y rounded-xl border border-[#E9E5FF] px-3.5 py-3 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-[#2501FF] focus:ring-2 focus:ring-[#2501FF]/10"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  {!user?.department_id || !user.session
                    ? "Set your department and session before applying."
                    : `${message.length}/1000 characters`}
                </p>
                <PrimaryButton
                  type="submit"
                  disabled={
                    submitting || !user?.department_id || !user.session
                  }
                >
                  {submitting ? "Sending request…" : "Submit request"}
                </PrimaryButton>
              </div>
              {(!user?.department_id || !user.session) && (
                <p className="mt-3 text-xs text-slate-500">
                  <Link to="/onboarding" className="font-bold text-[#2501FF] hover:underline">
                    Complete your academic profile
                  </Link>{" "}
                  to apply.
                </p>
              )}
            </form>
          )}
        </Card>

        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Your request history
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Updates</h2>
          {loading ? (
            <div className="mt-5 space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : requests.length ? (
            <div className="mt-4 space-y-3">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-xl border border-slate-100 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-slate-400">
                        {request.status === "approved" ? (
                          <CheckCircle2 size={17} />
                        ) : request.status === "revoked" || request.status === "rejected" ? (
                          <XCircle size={17} />
                        ) : (
                          <Clock3 size={17} />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-bold capitalize text-slate-800">
                          {request.status}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {request.department ?? user?.department} ·{" "}
                          {request.session}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${requestStatusStyle(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </div>
                  {request.decision_note && (
                    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                      {request.decision_note}
                    </p>
                  )}
                  {request.created_at && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      Submitted{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(request.created_at))}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#E6E0FF] bg-[#FCFBFF] px-4 py-8 text-center">
              <UsersRound size={22} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">
                No requests yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Once you apply, your request updates will show here.
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
