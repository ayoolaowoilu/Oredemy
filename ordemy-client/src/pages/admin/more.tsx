import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  Copy,
  Headphones,
  HelpCircle,
  Mail,
  MessageSquareWarning,
  Server,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  Card,
  PageIntro,
  StatCard,
} from "./shared";

const complaints = [
  {
    id: "c1",
    title: "Payment not reflecting in portal",
    student: "Amina Yusuf",
    status: "Open",
    age: "2 days",
  },
  {
    id: "c2",
    title: "Timetable missing for one course",
    student: "Tunde Adeyemi",
    status: "In review",
    age: "4 days",
  },
];

const tools = [
  {
    to: "/dashboard/admin/users",
    title: "Users",
    description: "Verify advisers and inspect accounts.",
    icon: ShieldCheck,
  },
  {
    to: "/dashboard/admin/academics",
    title: "Academics",
    description: "Manage schools, faculties and departments.",
    icon: Server,
  },
  {
    to: "/dashboard/admin/money",
    title: "Money",
    description: "Review payments and refunds.",
    icon: Star,
  },
];

export default function AdminMore() {
  const [copied, setCopied] = useState(false);
  const supportEmail = "support@oredemy.app";
  const visibleComplaints = import.meta.env.DEV ? complaints : [];

  async function copySupport() {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="Operations"
        title="More"
        description="Support tools, platform information and the admin shortcuts you use most."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<MessageSquareWarning size={19} />}
          label="Complaints"
          value={visibleComplaints.length}
          note="Awaiting an admin decision"
          color="bg-rose-50 text-rose-600"
        />
        <StatCard
          icon={<Headphones size={19} />}
          label="Support open"
          value={0}
          note="No unread support threads"
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={<Star size={19} />}
          label="App rating"
          value="—"
          note="Collecting student feedback"
          color="bg-violet-50 text-violet-700"
        />
        <StatCard
          icon={<Server size={19} />}
          label="Environment"
          value={import.meta.env.DEV ? "Dev" : "Live"}
          note="API connection status"
          color="bg-emerald-50 text-emerald-700"
        />
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:items-start">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#F1EDFF] text-[#2501FF]">
              <MessageSquareWarning size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0B1030]">Student complaints</h2>
              <p className="text-sm text-slate-500">
                Issues escalated to the admin team.
              </p>
            </div>
          </div>

          {visibleComplaints.length ? (
            <div className="mt-4 divide-y divide-[#F5F2FF]">
              {visibleComplaints.map((complaint) => (
                <article key={complaint.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0B1030]">
                        {complaint.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {complaint.student} · opened {complaint.age} ago
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        complaint.status === "Open"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {complaint.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[#E6E0FF] bg-[#FCFBFF] px-4 py-8 text-center">
              <HelpCircle size={22} className="mx-auto text-[#2501FF]" />
              <p className="mt-2 text-sm font-semibold text-[#0B1030]">
                No open complaints
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Escalated student issues will appear here.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-[#FCFBFF] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0B1030]">
                <Mail size={16} className="text-[#2501FF]" /> {supportEmail}
              </div>
              <button
                type="button"
                onClick={() => void copySupport()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EDFF] px-4 py-2 text-xs font-bold text-[#2501FF] hover:bg-[#E9E5FF]"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy email"}
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Admin shortcuts
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#0B1030]">
              Jump to a tool
            </h2>
            <div className="mt-4 space-y-2">
              {tools.map(({ to, title, description, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center gap-3 rounded-2xl border border-[#F0ECFF] p-3 transition-colors hover:border-[#2501FF]/25 hover:bg-[#FCFBFF]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#F1EDFF] text-[#2501FF]">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-[#0B1030]">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {description}
                    </span>
                  </span>
                  <ArrowUpRight
                    size={15}
                    className="shrink-0 text-slate-300 group-hover:text-[#2501FF]"
                  />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="bg-[#2501FF] text-white">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15">
              <ShieldCheck size={19} />
            </span>
            <h2 className="mt-4 text-lg font-bold">Super admin access</h2>
            <p className="mt-1 text-sm leading-6 text-white/75">
              Admin routes are protected by role checks. Keep your credentials
              private and sign out on shared devices.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
              Oredemy · Admin console
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
