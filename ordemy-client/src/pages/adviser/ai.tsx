import { useCallback, useEffect, useState } from "react";
import { Ban, Bell, Bot, Check, Clock3, RefreshCw, Repeat2, Send, Sparkles, UsersRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../lib/api";
import {
  connectAdviserSocket,
  disconnectAdviserSocket,
  cancelAiReplyRule,
  fetchAiRuns,
  fetchAiGroupQuestions,
  fetchAiNotifications,
  fetchSchedulerLogs,
  markAiNotificationRead,
  markAllAiNotificationsRead,
  saveAiReplyRule,
  sendAiDraft,
  updateAiDraft,
  type AiNotification,
  type AiRun,
  type AiGroupQuestion,
  type SchedulerLog,
} from "./api";
import { AdviserCard, AdviserNotice, AdviserPageIntro } from "./shared";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const previewGroups: AiRun["groups"] = [
  {
    id: 90001,
    run_id: 9000,
    title: "When will second semester results be released?",
    question_ids: Array.from({ length: 28 }, (_, index) => 90001 + index),
    draft_reply: "The department is finalizing the second semester results. We will share an update as soon as the release date is confirmed.",
    status: "pending",
    auto_sent: false,
    has_active_reply_rule: false,
    active_reply_text: null,
    matched_reply_rule_id: null,
    created_at: new Date().toISOString(),
    sent_at: null,
    high_volume: true,
    question_categories: [{ category: "Results", question_count: 28 }],
  },
  {
    id: 90002,
    run_id: 9000,
    title: "Where can I get my results slip?",
    question_ids: Array.from({ length: 17 }, (_, index) => 91001 + index),
    draft_reply: "Your results slip will be available from the student portal after the results are published.",
    status: "pending",
    auto_sent: false,
    has_active_reply_rule: false,
    active_reply_text: null,
    matched_reply_rule_id: null,
    created_at: new Date().toISOString(),
    sent_at: null,
    high_volume: false,
    question_categories: [{ category: "Results", question_count: 17 }],
  },
  {
    id: 90003,
    run_id: 9000,
    title: "How do I correct a missing course grade?",
    question_ids: Array.from({ length: 15 }, (_, index) => 92001 + index),
    draft_reply: "Please send your course code and student number to the department office so the grade can be checked.",
    status: "pending",
    auto_sent: false,
    has_active_reply_rule: false,
    active_reply_text: null,
    matched_reply_rule_id: null,
    created_at: new Date().toISOString(),
    sent_at: null,
    high_volume: false,
    question_categories: [{ category: "Results", question_count: 15 }],
  },
  {
    id: 90004,
    run_id: 9000,
    title: "When will the new lecture timetable be posted?",
    question_ids: [93001, 93002, 93003, 93004],
    draft_reply: "The updated timetable will be shared through the department notice board and student portal.",
    status: "pending",
    auto_sent: false,
    has_active_reply_rule: false,
    active_reply_text: null,
    matched_reply_rule_id: null,
    created_at: new Date().toISOString(),
    sent_at: null,
    high_volume: false,
    question_categories: [{ category: "Timetable", question_count: 4 }],
  },
];

const previewRun: AiRun = {
  id: 9000,
  slot_key: new Date().toISOString(),
  status: "completed",
  question_count: 64,
  severity: "critical",
  error_message: null,
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  groups: previewGroups,
  high_volume_categories: [{ category: "Results", question_count: 60 }],
};

const previewQuestions: Record<number, AiGroupQuestion[]> = {
  90001: [
    { id: 90001, subject: "Second semester results", query: "Please, when are the second semester results coming out?", query_type: "Results", created_at: new Date().toISOString(), student_id: "preview-student-1", student_name: "Amina Yusuf", student_image: null },
    { id: 90002, subject: "Second semester results", query: "Has the department announced the results release date?", query_type: "Results", created_at: new Date().toISOString(), student_id: "preview-student-2", student_name: "Daniel Okafor", student_image: null },
    { id: 90003, subject: "Second semester results", query: "I would like to know when our results will be published.", query_type: "Results", created_at: new Date().toISOString(), student_id: "preview-student-3", student_name: "Zainab Bello", student_image: null },
  ],
  90002: [
    { id: 91001, subject: "Results slip", query: "How can I download my result slip?", query_type: "Results", created_at: new Date().toISOString(), student_id: "preview-student-4", student_name: "Peter James", student_image: null },
    { id: 91002, subject: "Results slip", query: "Where do we print the semester result?", query_type: "Results", created_at: new Date().toISOString(), student_id: "preview-student-5", student_name: "Fatima Sani", student_image: null },
  ],
  90003: [
    { id: 92001, subject: "Missing course grade", query: "My grade for CSC 204 is missing from the portal.", query_type: "Results", created_at: new Date().toISOString(), student_id: "preview-student-6", student_name: "Michael Obi", student_image: null },
    { id: 92002, subject: "Missing course grade", query: "Who can help correct a course grade that is not showing?", query_type: "Results", created_at: new Date().toISOString(), student_id: "preview-student-7", student_name: "Grace Adeyemi", student_image: null },
  ],
  90004: [
    { id: 93001, subject: "Lecture timetable", query: "When will next week's timetable be available?", query_type: "Timetable", created_at: new Date().toISOString(), student_id: "preview-student-8", student_name: "Samuel Eze", student_image: null },
  ],
};

export default function AdviserAi() {
  const navigate = useNavigate();
  const { period: routePeriod, category: routeCategory, groupId: routeGroupId } = useParams();
  const [runs, setRuns] = useState<AiRun[]>([]);
  const [olderRuns, setOlderRuns] = useState<AiRun[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [olderLoaded, setOlderLoaded] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [schedulerLogs, setSchedulerLogs] = useState<SchedulerLog[]>([]);
  const [notifications, setNotifications] = useState<AiNotification[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [groupQuestions, setGroupQuestions] = useState<Record<number, AiGroupQuestion[]>>({});
  const [loadingGroup, setLoadingGroup] = useState<number | null>(null);

  const loadRuns = useCallback(async () => {
    setError("");
    try {
      const [response, logResponse] = await Promise.all([
        fetchAiRuns(),
        fetchSchedulerLogs(),
      ]);
      setRuns(response.data);
      setNextCursor(response.next_cursor);
      setSchedulerLogs(logResponse.data);
      setDrafts((existing) => {
        const next = { ...existing };
        for (const run of response.data) {
          for (const group of run.groups) {
            if (next[group.id] === undefined) {
              next[group.id] = group.active_reply_text ?? group.draft_reply;
            }
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

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetchAiNotifications();
      setNotifications(response.data);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof ApiError || loadError instanceof Error
          ? loadError.message
          : "Could not load AI notifications.",
      );
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      await loadRuns();
    }
    void initialize();
  }, [loadRuns]);

  const loadOlderRuns = useCallback(async (cursor: string | null, append: boolean) => {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    setError("");
    try {
      const response = await fetchAiRuns(cursor);
      setOlderRuns((current) => append ? [...current, ...response.data] : response.data);
      setOlderCursor(response.next_cursor);
      setOlderLoaded(true);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof ApiError || loadError instanceof Error
          ? loadError.message
          : "Could not load older question groups.",
      );
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder]);

  useEffect(() => {
    if (routePeriod === "older" && !olderLoaded && nextCursor) {
      const timer = window.setTimeout(() => void loadOlderRuns(nextCursor, false), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [loadOlderRuns, nextCursor, olderLoaded, routePeriod]);

  useEffect(() => {
    async function initialize() {
      await loadNotifications();
    }
    void initialize();

    const socket = connectAdviserSocket();
    const onAiNotification = (notification: AiNotification) => {
      setNotifications((current) => [
        notification,
        ...current.filter((item) => item.id !== notification.id),
      ].slice(0, 30));
      setNotice(notification.message);
    };
    socket.on("adviser:ai-notification", onAiNotification);
    return () => {
      socket.off("adviser:ai-notification", onAiNotification);
      disconnectAdviserSocket(socket);
    };
  }, [loadNotifications]);

  async function markNotificationRead(notification: AiNotification) {
    if (notification.is_read) return;
    try {
      await markAiNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );
      window.dispatchEvent(new Event("ordemy:ai-notifications-changed"));
    } catch (readError: unknown) {
      setError(
        readError instanceof ApiError || readError instanceof Error
          ? readError.message
          : "Could not mark this notification as read.",
      );
    }
  }

  async function markAllNotificationsRead() {
    try {
      await markAllAiNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      window.dispatchEvent(new Event("ordemy:ai-notifications-changed"));
    } catch (readError: unknown) {
      setError(
        readError instanceof ApiError || readError instanceof Error
          ? readError.message
          : "Could not mark notifications as read.",
      );
    }
  }

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

  async function saveFutureReply(runId: number, groupId: number) {
    const replyText = drafts[groupId] ?? "";
    setBusy(groupId);
    setError("");
    setNotice("");
    try {
      const response = await saveAiReplyRule(runId, groupId, replyText);
      setDrafts((current) => ({ ...current, [groupId]: replyText }));
      setNotice(response.message);
      await loadRuns();
    } catch (ruleError: unknown) {
      setError(
        ruleError instanceof ApiError || ruleError instanceof Error
          ? ruleError.message
          : "Could not save this automatic reply rule.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function cancelFutureReply(runId: number, groupId: number) {
    setBusy(groupId);
    setError("");
    setNotice("");
    try {
      const response = await cancelAiReplyRule(runId, groupId);
      setNotice(response.message);
      await loadRuns();
    } catch (ruleError: unknown) {
      setError(
        ruleError instanceof ApiError || ruleError instanceof Error
          ? ruleError.message
          : "Could not cancel this automatic reply rule.",
      );
    } finally {
      setBusy(null);
    }
  }

  const loadGroupQuestions = useCallback(async (runId: number, groupId: number) => {
    if (groupQuestions[groupId] || loadingGroup === groupId) {
      setExpandedGroup(groupId);
      return;
    }
    if (previewMode) {
      setGroupQuestions((current) => ({
        ...current,
        [groupId]: previewQuestions[groupId] ?? [],
      }));
      setExpandedGroup(groupId);
      return;
    }
    setExpandedGroup(groupId);
    setLoadingGroup(groupId);
    try {
      const response = await fetchAiGroupQuestions(runId, groupId);
      setGroupQuestions((current) => ({ ...current, [groupId]: response.data }));
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Could not load students in this group.");
      setExpandedGroup(null);
    } finally {
      setLoadingGroup(null);
    }
  }, [groupQuestions, loadingGroup, previewMode]);

  const selectedPeriod = routePeriod === "older" ? "older" : "recent";
  const selectedCategory = routeCategory ?? "";
  const selectedGroupId = routeGroupId ? Number(routeGroupId) : null;
  const visibleRuns = previewMode
    ? [previewRun]
    : selectedPeriod === "older"
      ? olderRuns
      : runs;
  const visibleGroups = visibleRuns.flatMap((run) =>
    run.groups
      .filter((group) => !selectedCategory || group.question_categories.some(
        (item) => item.category.toLowerCase() === selectedCategory.toLowerCase(),
      ))
      .filter((group) => selectedGroupId === null || group.id === selectedGroupId)
      .map((group) => ({ ...group, run, runStatus: run.status, runKey: run.slot_key })),
  );
  const selectedGroup = visibleGroups[0];
  const categorySummaries = Array.from(
    visibleRuns.reduce((summary, run) => {
      for (const group of run.groups) {
        for (const item of group.question_categories) {
          const current = summary.get(item.category) ?? { count: 0, groups: 0, alert: false };
          current.count += Number(item.question_count);
          current.groups += 1;
          current.alert ||= group.high_volume || run.high_volume_categories.some(
            (alert) => alert.category === item.category,
          );
          summary.set(item.category, current);
        }
      }
      for (const alert of run.high_volume_categories) {
        const current = summary.get(alert.category) ?? { count: 0, groups: 0, alert: false };
        current.count = Math.max(current.count, alert.question_count);
        current.alert = true;
        summary.set(alert.category, current);
      }
      return summary;
    }, new Map<string, { count: number; groups: number; alert: boolean }>()),
    ([category, summary]) => ({ category, ...summary }),
  ).sort((first, second) => second.count - first.count);

  useEffect(() => {
    if (!selectedGroupId || !selectedGroup) return;
    const timer = window.setTimeout(
      () => void loadGroupQuestions(selectedGroup.run_id, selectedGroup.id),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [loadGroupQuestions, selectedGroup, selectedGroupId]);

  function navigateToPeriod(period: "recent" | "older") {
    navigate(`/dashboard/adviser/ai/${period}`);
  }

  async function refreshQuestions() {
    await loadRuns();
    if (selectedPeriod === "older") {
      setOlderRuns([]);
      setOlderLoaded(false);
    }
  }

  function navigateToCategory(category: string) {
    navigate(`/dashboard/adviser/ai/${selectedPeriod}/${encodeURIComponent(category)}`);
  }

  function navigateToGroup(groupId: number) {
    navigate(`/dashboard/adviser/ai/${selectedPeriod}/${encodeURIComponent(selectedCategory)}/${groupId}`);
  }

  return (
    <>
      <AdviserPageIntro
        eyebrow="AI question assistant"
        title="Questions"
        description={selectedGroupId
          ? "Review the students in this question group and the response prepared to address it."
          : selectedCategory
            ? `Review AI-grouped questions about ${selectedCategory}.`
            : "Review recent AI-grouped student questions by category, with older history kept separate."}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPreviewMode((current) => !current);
                navigate("/dashboard/adviser/ai/recent");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-white px-4 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F7F5FF]"
            >
              <Sparkles size={15} /> {previewMode ? "Exit preview" : "Preview sample data"}
            </button>
            <button
              type="button"
              onClick={() => void refreshQuestions()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF] disabled:opacity-50"
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        }
      />
      {previewMode && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Sample preview only — the displayed questions and replies are fictional. No messages or alerts will be sent.
        </div>
      )}
      {error && <AdviserNotice dismiss={() => setError("")}>{error}</AdviserNotice>}
      {notice && (
        <AdviserNotice tone="success" dismiss={() => setNotice("")}>{notice}</AdviserNotice>
      )}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#2501FF]/15 bg-[#2501FF]/[0.04] p-4">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-[#2501FF]" />
        <p className="text-sm leading-6 text-slate-700">
          Groups run hourly from 12pm–5pm Africa/Lagos. AI sees question subjects and text to group similar issues. Nothing is sent automatically unless you enable it for a specific group below. Future questions must match that group’s examples; the saved reply is sent as written, and you can cancel the rule at any time.
        </p>
      </div>
      {!selectedCategory && !selectedGroupId && !previewMode && <AdviserCard className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#2501FF]/[0.08] text-[#2501FF]">
              <Bell size={18} />
            </span>
            <div>
              <h2 className="font-bold text-slate-950">AI notifications</h2>
              <p className="text-xs text-slate-500">
                {notifications.filter((item) => !item.is_read).length} unread
              </p>
            </div>
          </div>
          {notifications.some((item) => !item.is_read) && (
            <button
              type="button"
              onClick={() => void markAllNotificationsRead()}
              className="text-xs font-bold text-[#2501FF] hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            You’ll be notified here when scheduled AI question groups are ready or automatically answered.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {notifications.slice(0, 5).map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => void markNotificationRead(notification)}
                  className={`flex w-full items-start gap-3 py-3 text-left ${
                    notification.is_read ? "opacity-60" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      notification.is_read ? "bg-slate-300" : "bg-[#2501FF]"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-slate-700">{notification.message}</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {formatDate(notification.created_at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdviserCard>}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(["recent", "older"] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => navigateToPeriod(period)}
              disabled={period === "older" && !nextCursor && !olderRuns.length && !previewMode}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                selectedPeriod === period ? "bg-white text-[#2501FF] shadow-sm" : "text-slate-500 hover:text-slate-800"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {period === "recent" ? "Recent questions" : "Older questions"}
            </button>
          ))}
        </div>
        {(selectedCategory || selectedGroupId) && (
          <button
            type="button"
            onClick={() => selectedGroupId ? navigateToCategory(selectedCategory) : navigateToPeriod(selectedPeriod)}
            className="text-sm font-semibold text-[#2501FF] hover:underline"
          >
            ← {selectedGroupId ? `Back to ${selectedCategory}` : "Back to categories"}
          </button>
        )}
      </div>
      {loading && !runs.length && !previewMode ? (
        <div className="grid gap-4">
          {[1, 2].map((item) => (
            <div key={item} className="h-52 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      ) : selectedCategory === "" && !selectedGroupId ? (
        categorySummaries.length === 0 ? (
          <AdviserCard className="py-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#2501FF]/[0.08] text-[#2501FF]">
              <Bot size={22} />
            </span>
            <h2 className="mt-4 font-bold text-slate-950">No grouped questions yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              AI-grouped questions will appear here after the next processing window.
            </p>
          </AdviserCard>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categorySummaries.map(({ category, count, groups: groupCount, alert }) => {
                const thresholdReached = count >= 50 || alert;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => navigateToCategory(category)}
                    className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      thresholdReached || alert
                        ? "border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-slate-950">{category}</h2>
                        <p className="mt-1 text-xs text-slate-500">{groupCount} grouped issue{groupCount === 1 ? "" : "s"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        thresholdReached ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {thresholdReached ? "Report ready" : `Below threshold (${count} of 50)`}
                      </span>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${thresholdReached ? "bg-rose-500" : "bg-[#2501FF]"}`}
                        style={{ width: `${Math.min(100, (count / 50) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{count} linked question{count === 1 ? "" : "s"}</span>
                      <span>Threshold: 50</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedPeriod === "older" && olderCursor && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  disabled={loadingOlder}
                  onClick={() => void loadOlderRuns(olderCursor, true)}
                  className="rounded-full border border-[#F0ECFF] bg-white px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F7F5FF] disabled:opacity-50"
                >
                  {loadingOlder ? "Loading…" : "Load more older questions"}
                </button>
              </div>
            )}
          </>
        )
      ) : visibleGroups.length === 0 ? (
        <AdviserCard className="py-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#2501FF]/[0.08] text-[#2501FF]">
            <Bot size={22} />
          </span>
          <h2 className="mt-4 font-bold text-slate-950">No questions in this category yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Try the other time period or return to the category list.
          </p>
        </AdviserCard>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map(({ run, ...group }) => (
              <AdviserCard
                key={group.id}
                className={group.high_volume
                  ? "border border-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.28)] ring-1 ring-rose-300"
                  : ""}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-950">{group.title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${group.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                        {group.auto_sent ? "Auto-sent" : group.status === "sent" ? "Sent" : "Needs review"}
                      </span>
                      {group.high_volume && (
                        <span className="animate-pulse rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase text-rose-800">
                          {group.question_categories
                            .filter((category) => run.high_volume_categories.some(
                              (alert) => alert.category === category.category,
                            ))
                            .map((category) => {
                              const alert = run.high_volume_categories.find(
                                (item) => item.category === category.category,
                              );
                              return `${category.category}: ${alert?.question_count ?? 0} today`;
                            })
                            .join(" · ")} questions — lecturer alert
                        </span>
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
                {selectedGroupId === null ? (
                  <button
                    type="button"
                    onClick={() => navigateToGroup(group.id)}
                    className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-[#F1EDFF]"
                  >
                    <UsersRound size={14} />
                    {`Open ${group.question_ids.length} student question${group.question_ids.length === 1 ? "" : "s"}`}
                  </button>
                ) : (
                  <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <UsersRound size={14} />
                    {`${group.question_ids.length} linked question${group.question_ids.length === 1 ? "" : "s"}`}
                  </p>
                )}
                {selectedGroupId !== null && expandedGroup === group.id && (
                  <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                    {loadingGroup === group.id ? (
                      <p className="text-xs text-slate-500">Loading questions…</p>
                    ) : (groupQuestions[group.id] ?? []).map((question) => (
                      <div key={question.id} className="flex items-start gap-2 rounded-lg bg-white p-3">
                        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F1EDFF] text-[10px] font-bold text-[#2501FF]">
                          {question.student_image
                            ? <img src={question.student_image} alt="" className="size-full object-cover" />
                            : question.student_name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800">{question.student_name}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{question.subject} · {question.query_type}</p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{question.query}</p>
                        </div>
                      </div>
                    ))}
                    {previewMode && (
                      <p className="text-[10px] text-slate-500">Showing fictional sample submissions for preview.</p>
                    )}
                    <div className="rounded-lg border border-[#2501FF]/10 bg-white p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2501FF]">AI-generated response for this issue</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{group.draft_reply}</p>
                    </div>
                  </div>
                )}
                {selectedGroupId === null ? (
                  <p className="mt-4 text-sm leading-6 text-slate-600">{group.draft_reply}</p>
                ) : (
                <>
                <label className="mt-5 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Reply draft</span>
                  <textarea
                    value={drafts[group.id] ?? group.active_reply_text ?? group.draft_reply}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [group.id]: event.target.value }))
                    }
                    disabled={previewMode || (group.status === "sent" && !group.has_active_reply_rule)}
                    rows={5}
                    maxLength={10000}
                    className="w-full resize-y rounded-xl border border-[#E9E5FF] bg-[#FCFBFF] px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-[#2501FF]/50 focus:bg-white focus:ring-4 focus:ring-[#2501FF]/[0.08] disabled:opacity-70"
                  />
                </label>
                {group.has_active_reply_rule && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
                    Automatic reply is on for this issue. Future matching questions use the approved reply shown here.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {group.has_active_reply_rule && (
                    <button
                      type="button"
                      disabled={previewMode || busy !== null}
                      onClick={() => void cancelFutureReply(run.id, group.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Ban size={15} /> {busy === group.id ? "Working…" : "Cancel future replies"}
                    </button>
                  )}
                  {(!group.has_active_reply_rule ||
                    (drafts[group.id] ?? group.active_reply_text ?? group.draft_reply) !==
                      group.active_reply_text) && (
                    <button
                      type="button"
                      disabled={previewMode || busy !== null || !(drafts[group.id] ?? group.draft_reply).trim()}
                      onClick={() => void saveFutureReply(run.id, group.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <Repeat2 size={15} /> {busy === group.id
                        ? "Working…"
                        : group.has_active_reply_rule
                          ? "Update future reply"
                          : "Reply to questions like this in future"}
                    </button>
                  )}
                </div>
                {group.status === "pending" && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={previewMode || busy !== null}
                      onClick={() => void saveDraft(run.id, group.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF] disabled:opacity-50"
                    >
                      <Check size={15} /> {busy === group.id ? "Working…" : "Save draft"}
                    </button>
                    <button
                      type="button"
                      disabled={previewMode || busy !== null || !(drafts[group.id] ?? group.draft_reply).trim()}
                      onClick={() => void sendDraft(run.id, group.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2501FF] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d00d6] disabled:opacity-50"
                    >
                      <Send size={15} /> Send to students
                    </button>
                  </div>
                )}
                </>
                )}
              </AdviserCard>
          ))}
        </div>
      )}
      {!previewMode && visibleRuns.some((run) => run.status === "failed") && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="font-bold text-rose-800">Some scheduled runs failed</p>
          {visibleRuns.filter((run) => run.status === "failed").map((run) => (
            <p key={run.id} className="mt-2 text-sm text-rose-700">
              {run.slot_key}: {run.error_message ?? "No error details were saved."}
            </p>
          ))}
        </div>
      )}
      {!previewMode && !selectedCategory && <AdviserCard className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-950">Scheduler activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              Durable startup, hourly heartbeat and sleep-recovery events.
            </p>
          </div>
          <Clock3 size={18} className="text-slate-400" />
        </div>
        {schedulerLogs.length ? (
          <div className="mt-4 divide-y divide-slate-100">
            {schedulerLogs.slice(0, 10).map((log, index) => (
              <div key={`${log.event_type}-${log.created_at}-${index}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{log.event_type.replaceAll("_", " ")}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{log.details}</p>
                </div>
                <time className="shrink-0 text-xs text-slate-400">{formatDate(log.created_at)}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">The scheduler has not written any activity yet.</p>
        )}
      </AdviserCard>}
    </>
  );
}
