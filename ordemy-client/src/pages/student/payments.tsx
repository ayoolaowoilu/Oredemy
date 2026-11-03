import { CreditCard } from "lucide-react";
import { Card, PageIntro } from "./shared";

export default function StudentPayments() {
  return (
    <>
      <PageIntro
        eyebrow="Billing"
        title="Payment history"
        description="Payment tracking is coming soon."
      />
      <Card className="mt-5 flex flex-col items-center px-4 py-10 text-center sm:mt-7 sm:px-6 sm:py-14">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#2501FF]/[0.08] text-[#2501FF]">
          <CreditCard size={24} />
        </span>
        <span className="mt-5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          Coming soon
        </span>
        <h2 className="mt-3 text-lg font-bold text-slate-950">
          Student payments are on the way
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          Payment history and school-fee tracking will be available here soon.
        </p>
      </Card>
    </>
  );
}
