import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MessageCircle,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import type { StudentDashboardResponse } from "../../utils/types";
import { calculateLevel, getCurrentAcademicSession } from "../../utils/level";
import { fetchStudentDashboard } from "./api";
import { Card, Notice, PageIntro } from "./shared";

const initialDashboard: StudentDashboardResponse = {
  stats: { totalQueries: 0, queriesWithReply: 0, awaitingReply: 0 },
  recentQueries: [],
};

function Stat({
  icon,
  label,
  value,
  note,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  note: string;
  color: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={`grid size-10 place-items-center rounded-xl ${color}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{note}</p>
    </Card>
  );
}

export default function StudentOverview() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchStudentDashboard()
      .then((response) => {
        if (active) setDashboard(response);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : "We couldn’t load your dashboard.",
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

  const answeredPercent = dashboard.stats.totalQueries
    ? Math.round(
        (dashboard.stats.queriesWithReply / dashboard.stats.totalQueries) * 100,
      )
    : 0;
  const academicSession = getCurrentAcademicSession(
    user?.calendar_offset ?? 0,
  );
  const currentLevel = user
    ? calculateLevel(
        user.admission_session ?? user.session ?? "",
        academicSession.label,
      )
    : null;

  return (
    <>
      {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}
      <PageIntro
        eyebrow={new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date())}
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "student"}.`}
        description="A clear view of your questions, adviser replies and class activity."
      />

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#2501FF] px-5 py-4 text-white sm:px-6">
        <div>
          <p className="text-sm font-bold">
            {user?.department ?? "Your student profile"}
          </p>
          <p className="mt-1 text-xs text-white/75">
            {user?.session
              ? `Session ${user.session} · ${user.admission_session ? `Started ${user.admission_session}` : "Academic profile"}`
              : "Add your department and session to get started"}
          </p>
        </div>
        {!user?.department_id && (
          <Link
            to="/onboarding"
            className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#2501FF] hover:bg-violet-50"
          >
            Complete profile
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<MessageSquareText size={19} />}
          label="Questions sent"
          value={loading ? "—" : dashboard.stats.totalQueries}
          note="All your submitted questions"
          color="bg-blue-50 text-blue-700"
        />
        <Stat
          icon={<CheckCircle2 size={19} />}
          label="Answered by adviser"
          value={loading ? "—" : dashboard.stats.queriesWithReply}
          note="Replies from your assigned lecturer"
          color="bg-emerald-50 text-emerald-700"
        />
        <Stat
          icon={<Clock3 size={19} />}
          label="Awaiting reply"
          value={loading ? "—" : dashboard.stats.awaitingReply}
          note="Your adviser has not replied yet"
          color="bg-amber-50 text-amber-700"
        />
        <Stat
          icon={<GraduationCap size={20} />}
          label="Current level"
          value={currentLevel === null ? "—" : `${currentLevel}L`}
          note={user?.admission_session ? `Started ${user.admission_session}` : "Add your admission session"}
          color="bg-violet-50 text-violet-700"
        />
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Your questions
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">
                Response progress
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Questions with replies from your assigned adviser.
              </p>
            </div>
            <span className="rounded-full bg-[#2501FF]/[0.08] px-3 py-1 text-xs font-bold text-[#2501FF]">
              {answeredPercent}%
            </span>
          </div>
          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-[#e8e5ff]"
            role="progressbar"
            aria-label="Adviser response progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={answeredPercent}
          >
            <div
              className="h-full rounded-full bg-[#2501FF] transition-[width] duration-300"
              style={{ width: `${answeredPercent}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>{dashboard.stats.queriesWithReply} replied</span>
            <span>{dashboard.stats.totalQueries} total</span>
          </div>

          <div className="mt-7 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900">Recent questions</h3>
            <Link
              to="/dashboard/student/questions"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2501FF] hover:underline"
            >
              See all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="mt-4 space-y-2">
              <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : dashboard.recentQueries.length ? (
            <div className="mt-2 divide-y divide-slate-100">
              {dashboard.recentQueries.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {question.subject}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {question.query_type} ·{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        month: "short",
                        day: "numeric",
                      }).format(new Date(question.created_at))}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      question.has_reply
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {question.has_reply ? "Replied" : "Waiting"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
              <MessageSquareText className="mx-auto text-slate-300" size={22} />
              <p className="mt-2 text-sm font-semibold text-slate-700">
                No questions just yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Send your adviser a question whenever you need help.
              </p>
            </div>
          )}
        </Card>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Quick actions
          </p>
          <div className="space-y-3">
            <QuickLink
              to="/dashboard/student/questions"
              icon={<MessageCircle size={19} />}
              title="Ask your adviser"
              text="Get help with results, facilities or another issue."
              color="bg-blue-50 text-blue-700"
            />
            <QuickLink
              to="/dashboard/student/chat"
              icon={<MessageCircle size={19} />}
              title="Open adviser chat"
              text="Continue the conversation with your department adviser."
              color="bg-violet-50 text-violet-700"
            />
            <QuickLink
              to="/dashboard/student/classrep"
              icon={<UsersRound size={19} />}
              title="Class representative"
              text="Request to represent your class and check status."
              color="bg-emerald-50 text-emerald-700"
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <BookOpen size={19} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Helpful tip</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Include a clear subject to help your adviser respond faster.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function QuickLink({
  to,
  icon,
  title,
  text,
  color,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-[#2501FF]/30 hover:bg-[#fcfbff]"
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span>
      </span>
      <ArrowUpRight
        size={16}
        className="shrink-0 text-slate-300 group-hover:text-[#2501FF]"
      />
    </Link>
  );
}
