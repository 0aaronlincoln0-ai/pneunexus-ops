import { FileText } from "lucide-react";
import { BrandMark } from "../components/BrandMark";

export function TermsPage() {
  return (
    <main className="min-h-[100dvh] bg-[#05080c] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="inline-flex items-center gap-3 text-white" aria-label="Resovii home">
          <BrandMark />
          <span className="text-base font-semibold">Resovii</span>
        </a>

        <section className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
          <div className="flex items-center gap-3 text-teal-200">
            <FileText size={22} />
            <p className="text-sm font-semibold uppercase tracking-[0.14em]">
              Terms of service
            </p>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Resovii Pocket Technician Terms
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            These terms describe the intended use of Resovii Pocket Technician for app directory
            review and customer evaluation. Organization-specific subscriptions, data processing,
            support commitments, purchasing, and security terms are governed by the applicable
            Resovii workspace agreement.
          </p>

          <div className="mt-7 space-y-6 text-sm leading-7 text-slate-400">
            <section>
              <h2 className="text-lg font-semibold text-white">Permitted use</h2>
              <p className="mt-2">
                Pocket Technician is for qualified hospital infrastructure and pneumatic tube
                maintenance personnel. It may be used to request equipment-only troubleshooting
                guidance, review approved checks, and document observations for maintenance work.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Restricted use</h2>
              <p className="mt-2">
                Do not use Pocket Technician for patient care, clinical diagnosis, medication
                decisions, specimen identification, live equipment control, unauthorized network
                changes, or any bypass of lockout/tagout, infection-control, security, or site
                authorization requirements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">No protected health information</h2>
              <p className="mt-2">
                Users must not submit patient names, medical record numbers, dates of birth,
                specimen identifiers, medication labels, patient photographs, or other protected
                health information. Pocket Technician is designed for equipment and infrastructure
                information only.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Decision support only</h2>
              <p className="mt-2">
                Pocket Technician provides decision support grounded in reviewed procedures. Current
                site manuals, manufacturer documentation, hospital policy, and qualified personnel
                remain authoritative.
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
