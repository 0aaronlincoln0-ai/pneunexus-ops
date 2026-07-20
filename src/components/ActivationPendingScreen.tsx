import { Clock3, LogOut, MailCheck } from "lucide-react";
import { useAuth } from "../auth";
import { BrandMark } from "./BrandMark";
import { Button } from "./ui/button";

export function ActivationPendingScreen() {
  const { user, logout } = useAuth();
  return (
    <main className="login-ambient grid min-h-[100dvh] place-items-center bg-[#05080c] px-5 text-slate-100">
      <section className="surface-panel w-full max-w-lg rounded-xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.32)] sm:p-8">
        <div className="flex items-center gap-3">
          <BrandMark className="h-11 w-11" />
          <div>
            <p className="font-semibold text-white">Resovii</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Workspace activation
            </p>
          </div>
        </div>
        <div className="mt-9 grid h-11 w-11 place-items-center rounded-lg bg-teal-300/[0.08] text-teal-200">
          <Clock3 size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-white">Your workspace is awaiting activation.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Your account is set up. Resovii will activate access after the organization agreement,
          purchase order, pilot, or internal approval is recorded.
        </p>
        <div className="mt-6 flex items-start gap-3 border-y border-white/[0.08] py-4 text-sm text-slate-400">
          <MailCheck size={18} className="mt-0.5 shrink-0 text-teal-300" />
          <p>
            Activation updates will be sent to <strong className="font-semibold text-slate-200">{user?.email}</strong>.
          </p>
        </div>
        <Button className="mt-7 w-full" variant="secondary" onClick={() => void logout()}>
          <LogOut size={17} /> Sign out
        </Button>
      </section>
    </main>
  );
}
