import { Route } from "lucide-react";
import { cn } from "../lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-teal-200/25 bg-[#0a2c2a] text-teal-100 shadow-[0_14px_32px_rgba(45,212,191,0.2)] before:absolute before:inset-1 before:rounded-lg before:border before:border-teal-200/20 before:bg-teal-300/[0.12]",
        className,
      )}
    >
      <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-teal-300 text-[#04100f] shadow-[0_4px_12px_rgba(45,212,191,0.36)]">
        <Route size={17} strokeWidth={2.5} />
      </span>
      <div className="absolute right-0 top-0 h-3 w-3 border-b border-l border-teal-100/30" />
    </div>
  );
}
