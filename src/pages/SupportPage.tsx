import { LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import { BrandMark } from "../components/BrandMark";

export function SupportPage() {
  return (
    <main className="min-h-[100dvh] bg-[#05080c] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="inline-flex items-center gap-3 text-white" aria-label="Resovii home">
          <BrandMark />
          <span className="text-base font-semibold">Resovii</span>
        </a>

        <section className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
          <div className="flex items-center gap-3 text-teal-200">
            <LifeBuoy size={22} />
            <p className="text-sm font-semibold uppercase tracking-[0.14em]">
              Customer support
            </p>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Resovii Pocket Technician Support
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Resovii supports hospital infrastructure teams using Pocket Technician for
            equipment-only pneumatic tube troubleshooting. For account, access, billing, privacy,
            security, or product issues, use the contact path provided in your Resovii workspace
            agreement.
          </p>

          <div className="mt-7 grid gap-4">
            <section className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
              <div className="flex items-center gap-3 text-white">
                <Mail size={18} className="text-teal-300" />
                <h2 className="text-base font-semibold">Support requests</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Include your organization name, workspace email, the affected page or tool, and a
                short equipment-only description of what happened. Do not include patient,
                specimen, medication, medical-record, or other protected health information.
              </p>
            </section>

            <section className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
              <div className="flex items-center gap-3 text-white">
                <ShieldCheck size={18} className="text-teal-300" />
                <h2 className="text-base font-semibold">Safety escalation</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                If a tube-system condition creates a safety, infection-control, chain-of-custody,
                hazardous-material, or service-outage concern, follow your hospital procedure and
                vendor escalation path first. Pocket Technician does not replace site policy,
                manufacturer instructions, or qualified personnel.
              </p>
            </section>
          </div>

          <p className="mt-8 border-t border-white/[0.07] pt-5 text-xs text-slate-600">
            Last updated July 20, 2026.
          </p>
        </section>
      </div>
    </main>
  );
}
