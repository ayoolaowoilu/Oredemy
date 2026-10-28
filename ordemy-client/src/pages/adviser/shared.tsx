import type { ReactNode } from "react";

export function AdviserPageIntro({
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
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#2501FF]">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
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

export function AdviserCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.035)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function AdviserNotice({
  children,
  tone = "error",
  dismiss,
}: {
  children: ReactNode;
  tone?: "error" | "success" | "warning";
  dismiss?: () => void;
}) {
  const style = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];
  return (
    <div className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${style}`}>
      {children}
      {dismiss && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 font-bold"
        >
          ×
        </button>
      )}
    </div>
  );
}
