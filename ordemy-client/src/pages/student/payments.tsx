import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Clock3,
  Copy,
  CreditCard,
  ReceiptText,
  Search,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import {
  Card,
  EmptyState,
  PageIntro,
  StatCard,
} from "./shared";

type PaymentStatus = "paid" | "pending" | "failed";

interface Payment {
  id: string;
  reference: string;
  session: string;
  description: string;
  amount: number;
  status: PaymentStatus;
  date: string;
  method: string;
}

const demoPayments: Payment[] = [
  {
    id: "pay_001",
    reference: "ORD-2026-9F2A",
    session: "2025/2026",
    description: "First semester school fees",
    amount: 120000,
    status: "paid",
    date: "2026-09-14",
    method: "Card",
  },
  {
    id: "pay_002",
    reference: "ORD-2026-7C1B",
    session: "2025/2026",
    description: "Departmental dues",
    amount: 15000,
    status: "paid",
    date: "2026-09-20",
    method: "Transfer",
  },
  {
    id: "pay_003",
    reference: "ORD-2026-4D8E",
    session: "2025/2026",
    description: "Second semester school fees",
    amount: 120000,
    status: "pending",
    date: "2026-10-02",
    method: "Transfer",
  },
];

const filters: Array<{ key: "all" | PaymentStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
];

function statusStyle(status: PaymentStatus) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700";
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

export default function StudentPayments() {
  const { user } = useAuth();
  const payments = useMemo(
    () => (import.meta.env.DEV ? demoPayments : []),
    [],
  );
  const [filter, setFilter] = useState<"all" | PaymentStatus>("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesFilter = filter === "all" || payment.status === filter;
      const matchesQuery =
        !needle ||
        payment.description.toLowerCase().includes(needle) ||
        payment.reference.toLowerCase().includes(needle);
      return matchesFilter && matchesQuery;
    });
  }, [filter, payments, query]);

  const paid = payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + payment.amount, 0);
  const outstanding = payments
    .filter((payment) => payment.status === "pending")
    .reduce((total, payment) => total + payment.amount, 0);
  const receipts = payments.filter((payment) => payment.status === "paid").length;

  async function copyReference(reference: string) {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(reference);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="Billing"
        title="Payment history"
        description="Track school fees and departmental payments, and keep your references in one place."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet size={19} />}
          label="Total paid"
          value={formatMoney(paid)}
          note={`${receipts} confirmed payment${receipts === 1 ? "" : "s"}`}
          color="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          icon={<Clock3 size={19} />}
          label="Outstanding"
          value={formatMoney(outstanding)}
          note={outstanding > 0 ? "Waiting for confirmation" : "Nothing pending"}
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={<ReceiptText size={19} />}
          label="Records"
          value={payments.length}
          note="For your current profile"
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<BadgeCheck size={19} />}
          label="Session"
          value={user?.session ?? "—"}
          note={user?.department ?? "Your department"}
          color="bg-violet-50 text-violet-700"
        />
      </div>

      <Card className="mt-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Transactions
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#0B1030]">
              Your payment records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search by description or reference to find a receipt quickly.
            </p>
          </div>
          <label className="relative block w-full max-w-xs">
            <span className="sr-only">Search payments</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search payments…"
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
            {filtered.map((payment) => (
              <article
                key={payment.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F1EDFF] text-[#2501FF]">
                    <CreditCard size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#0B1030]">
                      {payment.description}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(payment.date))}{" "}
                      · {payment.method} · {payment.session}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copyReference(payment.reference)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#2501FF]"
                    >
                      {copied === payment.reference ? (
                        <>
                          <Check size={12} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> {payment.reference}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:shrink-0 sm:flex-col sm:items-end">
                  <p className="text-sm font-extrabold text-[#0B1030]">
                    {formatMoney(payment.amount)}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusStyle(payment.status)}`}
                  >
                    {payment.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              icon={<ReceiptText size={20} />}
              title={payments.length ? "No matching payments" : "No payments recorded yet"}
              description={
                payments.length
                  ? "Try a different filter or search term."
                  : "Your school and departmental payments will appear here once they are recorded."
              }
            />
          </div>
        )}
      </Card>
    </>
  );
}
