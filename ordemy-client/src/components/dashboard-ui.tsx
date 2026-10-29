import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#2501FF]">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1030] sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-3xl border border-[#F0ECFF] bg-white ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function Notice({
  children,
  tone = "error",
  onDismiss,
}: {
  children: ReactNode;
  tone?: "error" | "success" | "warning";
  onDismiss?: () => void;
}) {
  const style = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${style}`}
    >
      {children}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 font-bold"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  type = "button",
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#2501FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D01CC] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  disabled,
  type = "button",
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] transition-colors hover:bg-[#F1EDFF] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function StatCard({
  icon,
  label,
  value,
  note,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  note?: string;
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
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#0B1030]">
        {value}
      </p>
      {note && <p className="mt-1 text-xs leading-5 text-slate-400">{note}</p>}
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E6E0FF] bg-[#FCFBFF] px-4 py-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-[#2501FF]">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-[#0B1030]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
