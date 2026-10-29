import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Clock3,
  CreditCard,
  ReceiptText,
  Search,
  Wallet,
} from "lucide-react";
import {
  Card,
  EmptyState,
  PageIntro,
  StatCard,
} from "./shared";

type TxStatus = "settled" | "pending" | "refunded";

interface Transaction {
  id: string;
  student: string;
  department: string;
  reference: string;
  amount: number;
  status: TxStatus;
  date: string;
}

const demoTransactions: Transaction[] = [
  { id: "t1", student: "Amina Yusuf", department: "Computer Science", reference: "ORD-9F2A", amount: 120000, status: "settled", date: "2026-10-21" },
  { id: "t2", student: "Chidi Okonkwo", department: "Mechanical Engineering", reference: "ORD-7C1B", amount: 135000, status: "settled", date: "2026-10-20" },
  { id: "t3", student: "Fatima Bello", department: "Mass Communication", reference: "ORD-4D8E", amount: 98000, status: "pending", date: "2026-10-20" },
  { id: "t4", student: "Tunde Adeyemi", department: "Economics", reference: "ORD-1A5F", amount: 100000, status: "settled", date: "2026-10-18" },
  { id: "t5", student: "Grace Eze", department: "Computer Science", reference: "ORD-3B9C", amount: 15000, status: "refunded", date: "2026-10-16" },
];

const breakdown = [
  { label: "Tuition", value: 68, tone: "bg-[#2501FF]" },
  { label: "Departmental dues", value: 21, tone: "bg-violet-400" },
  { label: "Other fees", value: 11, tone: "bg-emerald-400" },
];

const filters: Array<{ key: "all" | TxStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "settled", label: "Settled" },
  { key: "pending", label: "Pending" },
  { key: "refunded", label: "Refunded" },
];

function statusStyle(status: TxStatus) {
  if (status === "settled") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminMoney() {
  const transactions = useMemo(
    () => (import.meta.env.DEV ? demoTransactions : []),
    [],
  );
  const [filter, setFilter] = useState<"all" | TxStatus>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      const byStatus = filter === "all" || tx.status === filter;
      const byQuery =
        !needle ||
        tx.student.toLowerCase().includes(needle) ||
        tx.department.toLowerCase().includes(needle) ||
        tx.reference.toLowerCase().includes(needle);
      return byStatus && byQuery;
    });
  }, [filter, query, transactions]);

  const revenue = transactions
    .filter((tx) => tx.status === "settled")
    .reduce((total, tx) => total + tx.amount, 0);
  const pending = transactions
    .filter((tx) => tx.status === "pending")
    .reduce((total, tx) => total + tx.amount, 0);
  const refunded = transactions
    .filter((tx) => tx.status === "refunded")
    .reduce((total, tx) => total + tx.amount, 0);

  return (
    <>
      <PageIntro
        eyebrow="Finance"
        title="Money"
        description="A clear view of payments, outstanding balances and refunds across the platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Banknote size={19} />}
          label="Settled revenue"
          value={formatMoney(revenue)}
          note="Confirmed this period"
          color="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          icon={<Clock3 size={19} />}
          label="Pending"
          value={formatMoney(pending)}
          note="Awaiting confirmation"
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={<ArrowDownLeft size={19} />}
          label="Refunded"
          value={formatMoney(refunded)}
          note="Returned to students"
          color="bg-rose-50 text-rose-700"
        />
        <StatCard
          icon={<ReceiptText size={19} />}
          label="Transactions"
          value={transactions.length}
          note="Across all departments"
          color="bg-blue-50 text-blue-700"
        />
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:items-start">
        <Card>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Ledger
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#0B1030]">
                Recent transactions
              </h2>
            </div>
            <label className="relative block w-full max-w-xs">
              <span className="sr-only">Search transactions</span>
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search student or reference…"
                className="w-full rounded-full border border-[#F0ECFF] bg-white py-2.5 pl-9 pr-4 text-sm text-[#0B1030] outline-none placeholder:text-slate-400 focus:border-[#2501FF] focus:ring-2 focus:ring-[#2501FF]/10"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  filter === key
                    ? "bg-[#2501FF] text-white"
                    : "bg-[#F7F5FF] text-slate-500 hover:text-[#2501FF]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length ? (
            <div className="mt-4 divide-y divide-[#F5F2FF]">
              {filtered.map((tx) => (
                <article
                  key={tx.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F1EDFF] text-[#2501FF]">
                      <CreditCard size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#0B1030]">
                        {tx.student}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {tx.department} · {tx.reference} ·{" "}
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                        }).format(new Date(tx.date))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0 sm:flex-col sm:items-end">
                    <p className="text-sm font-extrabold text-[#0B1030]">
                      {formatMoney(tx.amount)}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusStyle(tx.status)}`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={<ReceiptText size={20} />}
                title={transactions.length ? "No matching transactions" : "No transactions recorded"}
                description={
                  transactions.length
                    ? "Try a different filter or search term."
                    : "Payments will appear here once the finance service is connected."
                }
              />
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#F1EDFF] text-[#2501FF]">
                <Wallet size={19} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#0B1030]">Revenue mix</h2>
                <p className="text-sm text-slate-500">Where money comes from.</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {breakdown.map(({ label, value, tone }) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">{label}</span>
                    <span className="font-bold text-[#0B1030]">{value}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F2EFFF]">
                    <div
                      className={`h-full rounded-full ${tone}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-[#2501FF] text-white">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15">
              <ArrowUpRight size={19} />
            </span>
            <h2 className="mt-4 text-lg font-bold">Payouts are manual</h2>
            <p className="mt-1 text-sm leading-6 text-white/75">
              Finance exports are reviewed by the bursary before settlement.
              Connect a payment provider to automate reconciliation.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
