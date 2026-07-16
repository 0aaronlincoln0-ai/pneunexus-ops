import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading">
      <div className="h-9 w-72 rounded-lg bg-white/[0.05]" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-32 rounded-2xl border border-white/[0.05] bg-white/[0.035]" />
        ))}
      </div>
      <div className="h-96 rounded-2xl border border-white/[0.05] bg-white/[0.035]" />
    </div>
  );
}
export function PageError({ retry }: { retry(): void }) {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] text-rose-300">
          <AlertTriangle />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-100">
          Operational data unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The protected API could not load. Check the database connection and your session, then try
          again.
        </p>
        <Button className="mt-5" onClick={retry}>
          <RefreshCw size={17} />
          Try again
        </Button>
      </div>
    </div>
  );
}
export function PageHeading({
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
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px w-7 bg-teal-300/60" />
          <p className="eyebrow">{eyebrow}</p>
        </div>
        <h2 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
