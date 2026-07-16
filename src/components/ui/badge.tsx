import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const tones: Record<string, string> = {
  operational: "bg-emerald-400/[0.08] text-emerald-300 ring-emerald-400/20",
  degraded: "bg-amber-400/[0.08] text-amber-300 ring-amber-400/20",
  offline: "bg-rose-400/[0.08] text-rose-300 ring-rose-400/20",
  retired: "bg-slate-400/[0.08] text-slate-400 ring-slate-400/15",
  critical: "bg-rose-400/[0.08] text-rose-300 ring-rose-400/20",
  high: "bg-orange-400/[0.08] text-orange-300 ring-orange-400/20",
};

export function Badge({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-wide ring-1 ring-inset",
        tones[children] ?? "bg-teal-400/[0.08] text-teal-300 ring-teal-400/20",
        className,
      )}
      {...props}
    >
      {children.replaceAll("_", " ")}
    </span>
  );
}
