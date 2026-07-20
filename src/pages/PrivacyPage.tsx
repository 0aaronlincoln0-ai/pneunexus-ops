import { ShieldCheck } from "lucide-react";
import { BrandMark } from "../components/BrandMark";

export function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-[#05080c] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="inline-flex items-center gap-3 text-white" aria-label="Resovii home">
          <BrandMark />
          <span className="text-base font-semibold">Resovii</span>
        </a>

        <section className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
          <div className="flex items-center gap-3 text-teal-200">
            <ShieldCheck size={22} />
            <p className="text-sm font-semibold uppercase tracking-[0.14em]">
              Privacy policy
            </p>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Resovii Pocket Technician
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Resovii is designed for hospital infrastructure operations and pneumatic tube
            maintenance workflows. Pocket Technician accepts equipment-only troubleshooting
            observations and returns reviewed diagnostic guidance. It must not be used to enter,
            store, or identify patient names, medical record numbers, specimen identifiers,
            medications, diagnoses, patient photos, or other protected health information.
          </p>

          <div className="mt-7 space-y-6 text-sm leading-7 text-slate-400">
            <section>
              <h2 className="text-lg font-semibold text-white">Information we process</h2>
              <p className="mt-2">
                Pocket Technician may process equipment reports, fault text, station or device
                context, diagnostic conversation history, and optional equipment photos submitted by
                an authorized user. The system is intended for maintenance and infrastructure
                information only.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">How AI is used</h2>
              <p className="mt-2">
                Diagnostic requests are handled server-side. Resovii does not expose OpenAI or
                Netlify AI credentials to the browser. AI responses are grounded against reviewed
                troubleshooting procedures and are constrained to one safe next check at a time.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Safety boundaries</h2>
              <p className="mt-2">
                Pocket Technician does not control equipment, connect to live hospital tube-system
                servers, bypass lockout/tagout, replace site policy, or replace manufacturer
                procedures. Qualified personnel, current site manuals, and hospital policy remain
                authoritative.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Contact</h2>
              <p className="mt-2">
                For privacy, security, billing, or support questions, contact Resovii through the
                support and billing channels provided in your workspace agreement.
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
