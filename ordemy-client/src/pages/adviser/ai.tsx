import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Clock3, RefreshCw, Send, Sparkles } from "lucide-react";
import { ApiError } from "../../lib/api";
import {
  fetchAiRuns,
  sendAiDraft,
  updateAiDraft,
  type AiRun,
} from "./api";
import { AdviserCard, AdviserNotice, AdviserPageIntro } from "./shared";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdviserAi() {
  const [runs, setRuns] = useState<AiRun[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRuns = useCallback(async () => {
    setError("");
    try {
      const response = await fetchAiRuns();
      setRuns(response.data);
      setDrafts((existing) => {
        const next = { ...existing };
        for (const run of response.data) {
          for (const group of run.groups) {
            if (next[group.id] === undefined) next[group.id] = group.draft_reply;
          }
        }
        return next;
      });
    } catch (loadError: unknown) {
      setError(
        loadError instanceof ApiError || loadError instanceof Error
          ? loadError.message
          : "Could not load AI question groups.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      await loadRuns();
    }
    void initialize();
  }, [loadRuns]);

  async function saveDraft(runId: number, groupId: number) {
    setBusy(groupId);
    setError("");
    setNotice("");
    try {
      await updateAiDraft(runId, groupId, drafts[groupId] ?? "");
      setNotice("Draft saved. Review it carefully before sending.");
      await loadRuns();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof ApiError || saveError instanceof Error
          ? saveError.message
          : "Could not save the reply draft.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function sendDraft(runId: number, groupId: number) {
    setBusy(groupId);
    setError("");
    setNotice("");
    try {
      const reply = await sendAiDraft(runId, groupId);
      setNotice(`Reviewed reply sent to ${reply.recipients} student${reply.recipients === 1 ? "" : "s"}.`);
      await loadRuns();
    } catch (sendError: unknown) {
      setError(
        sendError instanceof ApiError || sendError instanceof Error
          ? sendError.message
          : "Could not send this reply.",
      );
    } finally {
      setBusy(null);
    }
  }

  const groups = runs.flatMap((run) =>
    run.groups.map((group) => ({ ...group, runStatus: run.status, runKey: run.slot_key })),
  );

  return (
    <>
      <AdviserPageIntro
        eyebrow="AI question assistant"
        title="Grouped questions"
        description="Review similar student questions and edit the suggested response. Sending is always a separate adviser action."
        action={
          <button
            type="button"
            onClick={() => void loadRuns()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-[#2501FF]/30 hover:text-[#2501FF] disabled:opacity-50"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      {error && <AdviserNotice dismiss={() => setError("")}>{error}</AdviserNotice>}
      {notice && (
        <AdviserNotice tone="success" dismiss={() => setNotice("")}>{notice}</AdviserNotice>
      )}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#2501FF]/15 bg-[#2501FF]/[0.04] p-4">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-[#2501FF]" />
        <p className="text-sm leading-6 text-slate-700">
          Groups run hourly from 12pm–5pm Africa/Lagos. AI sees the question subject and text. A draft can only reach students after you save your edits and explicitly send it.
        </p>
      </div>
      {loading && !runs.length ? (
        <div className="grid gap-4">
          {[1, 2].map((item) => (
            <div key={item} className="h-52 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <AdviserCard className="py-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#2501FF]/[0.08] text-[#2501FF]">
            <Bot size={22} />
          </span>
          <h2 className="mt-4 font-bold text-slate-950">No grouped questions yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Add your Groq key in AI settings. The scheduler will create groups in the next hourly window when questions are available.
          </p>
        </AdviserCard>
      ) : (
        <div className="space-y-5">
          {runs.map((run) =>
            run.groups.map((group) => (
              <AdviserCard key={group.id}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-950">{group.title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${group.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                        {group.status === "sent" ? "Sent" : "Needs review"}
                      </span>
                      {run.severity === "critical" && (
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase text-rose-700">High volume day</span>
                      )}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock3 size={13} /> {formatDate(group.created_at)} · {group.question_ids.length} linked question{group.question_ids.length === 1 ? "" : "s"} · slot {run.slot_key}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${run.status === "completed" ? "bg-emerald-50 text-emerald-700" : run.status === "failed" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                    Run {run.status}
                  </span>
                </div>
                <label className="mt-5 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Reply draft</span>
                  <textarea
                    value={drafts[group.id] ?? group.draft_reply}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [group.id]: event.target.value }))
                    }
                    disabled={group.status === "sent"}
                    rows={5}
                    maxLength={10000}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-[#2501FF]/50 focus:bg-white focus:ring-4 focus:ring-[#2501FF]/[0.08] disabled:opacity-70"
                  />
                </label>
                {group.status === "pending" && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void saveDraft(run.id, group.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Check size={15} /> {busy === group.id ? "Working…" : "Save draft"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null || !(drafts[group.id] ?? group.draft_reply).trim()}
                      onClick={() => void sendDraft(run.id, group.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2501FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d00d6] disabled:opacity-50"
                    >
                      <Send size={15} /> Send to students
                    </button>
                  </div>
                )}
              </AdviserCard>
            )),
          )}
        </div>
      )}
      {runs.some((run) => run.status === "failed") && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="font-bold text-rose-800">Some scheduled runs failed</p>
          {runs.filter((run) => run.status === "failed").map((run) => (
            <p key={run.id} className="mt-2 text-sm text-rose-700">
              {run.slot_key}: {run.error_message ?? "No error details were saved."}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
