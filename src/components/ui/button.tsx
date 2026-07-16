import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d13] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-teal-400 px-4 text-[#04100f] shadow-[0_10px_30px_rgba(45,212,191,0.14)] hover:bg-teal-300 hover:shadow-[0_14px_38px_rgba(45,212,191,0.2)]",
        variant === "secondary" &&
          "border border-white/10 bg-white/[0.035] px-4 text-slate-200 hover:border-white/20 hover:bg-white/[0.065]",
        variant === "ghost" && "px-3 text-slate-400 hover:bg-white/[0.055] hover:text-slate-100",
        variant === "danger" && "bg-rose-600 px-4 text-white hover:bg-rose-500",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "icon" && "h-11 w-11 p-0",
        className,
      )}
      {...props}
    />
  );
});
