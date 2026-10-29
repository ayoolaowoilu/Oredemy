interface AdminSectionProps {
  title: string;
}

export default function AdminSection({ title }: AdminSectionProps) {
  return (
    <section>
      <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1030] sm:text-[32px]">
        {title}
      </h1>
      <div className="mt-7 rounded-3xl border border-[#F0ECFF] bg-white p-6">
        <p className="text-sm text-slate-400">
          This section is being built out next.
        </p>
      </div>
    </section>
  );
}
