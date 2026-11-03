export function LoadingScreen({
  label = "Loading your workspace",
}: {
  label?: string;
}) {
  return (
    <div
      className="grid min-h-screen place-items-center bg-white px-6 font-['Poppins',sans-serif]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <img
          src="/ordemylogo.svg"
          alt="Oredemy"
          className="h-10 w-auto animate-pulse"
        />
        <span className="relative mt-8 grid size-12 place-items-center">
          <span className="absolute inset-0 rounded-full border-[3px] border-[#F1EDFF]" />
          <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#2501FF]" />
        </span>
        <p className="mt-5 text-sm font-semibold text-[#0B1030]">{label}</p>
        <p className="mt-1 text-xs text-slate-400">
          Bridging the gap between students and advisers
        </p>
      </div>
    </div>
  );
}

export function SkeletonList({
  rows = 3,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={`space-y-1 ${className}`}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl p-3">
          <span className="size-11 shrink-0 animate-pulse rounded-full bg-[#F1EDFF]" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="block h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
            <span className="block h-3 w-3/4 animate-pulse rounded-full bg-slate-100" />
          </span>
        </div>
      ))}
    </div>
  );
}
