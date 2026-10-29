import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageCircle,
  MessageSquareText,
  ReceiptText,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import type { StudentDashboardResponse } from "../../utils/types";
import { calculateLevel, getCurrentAcademicSession } from "../../utils/level";
import { fetchStudentDashboard } from "./api";
import { Notice, StatCard } from "./shared";

const initialDashboard: StudentDashboardResponse = {
  stats: { totalQueries: 0, queriesWithReply: 0, awaitingReply: 0 },
  recentQueries: [],
};

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

  const academicSession = getCurrentAcademicSession(
    user?.calendar_offset ?? 0,
  );
  const currentLevel = user
    ? calculateLevel(
        user.admission_session ?? user.session ?? "",
        academicSession.label,
      )
    : null;
  const subtitle = [
    currentLevel ? `Part ${currentLevel / 100}` : null,
    user?.department,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}

      <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1030] sm:text-[32px]">
        Welcome back, {user?.name ?? "Student"}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {subtitle || "Your student workspace"}
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={<Clock3 size={19} />}
          label="Waiting for reply"
          value={loading ? "—" : dashboard.stats.awaitingReply}
          note="Your adviser has not replied yet"
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={<CheckCircle2 size={19} />}
          label="Replied"
          value={loading ? "—" : dashboard.stats.queriesWithReply}
          note="Replies from your assigned adviser"
          color="bg-emerald-50 text-emerald-700"
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-[#0B1030]">What do you need?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Shortcut
            to="/dashboard/student/chat"
            icon={<MessageCircle size={19} />}
            title="Ask your adviser"
            text="Ask a question or report an issue"
          />
          <Shortcut
            to="/dashboard/student/questions"
            icon={<MessageSquareText size={19} />}
            title="My Questions"
            text="Your past messages"
          />
          <Shortcut
            to="/dashboard/student/curriculum"
            icon={<BookOpen size={19} />}
            title="Curriculum"
            text="Course updates"
          />
          <Shortcut
            to="/dashboard/student/payments"
            icon={<ReceiptText size={19} />}
            title="Payment history"
            text="Your receipts"
          />
          <Shortcut
            to="/dashboard/student/settings"
            icon={<SlidersHorizontal size={19} />}
            title="Settings"
            text="Theme and privacy"
          />
          <Shortcut
            icon={<CalendarClock size={19} />}
            title="Book Session"
            text="Coming soon"
            disabled
          />
        </div>
      </section>
    </>
  );
}

function Shortcut({
  to,
  icon,
  title,
  text,
  disabled = false,
}: {
  to?: string;
  icon: ReactNode;
  title: string;
  text: string;
  disabled?: boolean;
}) {
  const content = (
    <>
      <span
        className={`grid size-11 place-items-center rounded-2xl ${
          disabled
            ? "bg-slate-100 text-slate-400"
            : "bg-[#F1EDFF] text-[#2501FF]"
        }`}
      >
        {icon}
      </span>
      <span className="mt-4 flex items-center justify-between gap-2">
        <span
          className={`text-sm font-bold ${
            disabled ? "text-slate-400" : "text-[#0B1030]"
          }`}
        >
          {title}
        </span>
        {!disabled && (
          <ArrowUpRight
            size={16}
            className="shrink-0 text-slate-300 transition-colors group-hover:text-[#2501FF]"
          />
        )}
        {disabled && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-400">
            Coming soon
          </span>
        )}
      </span>
      <span
        className={`mt-1 block text-xs leading-5 ${
          disabled ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {text}
      </span>
    </>
  );

  if (disabled || !to) {
    return (
      <div
        aria-disabled="true"
        className="cursor-not-allowed rounded-3xl border border-[#F0ECFF] bg-white p-5 opacity-60 grayscale"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group rounded-3xl border border-[#F0ECFF] bg-white p-5 transition-colors hover:border-[#2501FF]/25 hover:bg-[#FCFBFF]"
    >
      {content}
    </Link>
  );
}
