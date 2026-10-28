import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bot,
  CheckCheck,
  MessageCircle,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { ApiError } from "../../lib/api";
import {
  fetchAdviserDashboard,
  type AdviserDashboard as AdviserDashboardData,
} from "./api";
import { AdviserCard, AdviserNotice, AdviserPageIntro } from "./shared";

const quickLinks = [
  {
    to: "/dashboard/adviser/ai",
    title: "Review AI drafts",
    description: "Edit grouped-question replies before sending.",
    icon: Bot,
  },
  {
    to: "/dashboard/adviser/class-reps",
    title: "Class-rep requests",
    description: "Review and decide pending applications.",
    icon: UsersRound,
  },
  {
    to: "/dashboard/adviser/chat",
    title: "Open adviser chats",
    description: "Respond directly or join the department group.",
    icon: MessageCircle,
  },
];

export default function AdviserOverview() {
  const [dashboard, setDashboard] = useState<AdviserDashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchAdviserDashboard()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof ApiError || loadError instanceof Error
              ? loadError.message
              : "Could not load adviser dashboard.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = dashboard?.stats;
  const metricCards = [
    { label: "Questions today", value: stats?.todayQuestions, icon: MessageSquareText, tone: "text-[#2501FF] bg-[#2501FF]/[0.08]" },
    { label: "Awaiting your reply", value: stats?.awaitingReply, icon: MessageCircle, tone: "text-amber-700 bg-amber-50" },
    { label: "Questions received", value: stats?.totalQuestions, icon: CheckCheck, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Rep requests pending", value: stats?.pendingClassRepRequests, icon: UsersRound, tone: "text-violet-700 bg-violet-50" },
  ];

  return (
    <>
      <AdviserPageIntro
        eyebrow="Department overview"
        title="Good to see you"
        description="A clear view of student questions, response needs and class-representative requests for your department."
      />
      {error && <AdviserNotice>{error}</AdviserNotice>}
      {stats?.dailyVolumeCritical && (
        <AdviserNotice tone="warning">
          <div>
            <p className="font-bold">Critical question volume</p>
            <p className="mt-1">
              More than 100 questions have arrived today. Email alerts are not configured yet, so this notice is shown in the adviser dashboard and recorded in scheduler logs.
            </p>
          </div>
        </AdviserNotice>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, icon: Icon, tone }) => (
          <AdviserCard key={label} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
                  {value === undefined ? "—" : value.toLocaleString()}
                </p>
              </div>
              <span className={`grid size-11 place-items-center rounded-xl ${tone}`}>
                <Icon size={19} />
              </span>
            </div>
          </AdviserCard>
        ))}
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <AdviserCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-slate-950">Quick actions</p>
              <p className="mt-1 text-sm text-slate-500">Go straight to the work that needs you.</p>
            </div>
            <span className="hidden size-10 place-items-center rounded-xl bg-[#2501FF]/[0.08] text-[#2501FF] sm:grid">
              <ArrowUpRight size={19} />
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {quickLinks.map(({ to, title, description, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl border border-slate-200 p-4 transition-colors hover:border-[#2501FF]/30 hover:bg-[#2501FF]/[0.025]"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-[#2501FF]/[0.08] text-[#2501FF]">
                  <Icon size={17} />
                </span>
                <span className="mt-3 flex items-center justify-between gap-2 text-sm font-bold text-slate-900">
                  {title}
                  <ArrowUpRight size={15} className="text-slate-400 transition-colors group-hover:text-[#2501FF]" />
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
              </Link>
            ))}
          </div>
        </AdviserCard>
        <AdviserCard className="bg-[#1d10b8] text-white">
          <span className="grid size-11 place-items-center rounded-xl bg-white/10">
            <Bot size={21} />
          </span>
          <h2 className="mt-5 text-xl font-bold">AI question assistant</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Similar questions are grouped during the 12pm–5pm Africa/Lagos window. Replies are drafts only; you review and choose when to send.
          </p>
          <Link
            to="/dashboard/adviser/ai"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#2501FF] hover:bg-violet-50"
          >
            Review groups <ArrowUpRight size={15} />
          </Link>
        </AdviserCard>
      </div>
    </>
  );
}
