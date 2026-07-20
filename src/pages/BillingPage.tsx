import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FileText, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth";
import {
  getBillingSummary,
  getPlatformOrganizations,
  transitionOrganization,
  type BillingSummary,
} from "../lib/api";
import { titleCase } from "../lib/utils";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";

function isPlatformAdministrator(role: string | undefined) {
  return role === "platform_super_admin";
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)) : "Not set";
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value));
}

export function BillingPage() {
  const { user } = useAuth();
  if (isPlatformAdministrator(user?.role)) return <PlatformBillingPage />;
  return <CustomerBillingPage />;
}

function CustomerBillingPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["billing"], queryFn: getBillingSummary });
  const organization = data?.organization;
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Organization account"
        title="Billing and agreement"
        description="View your organization agreement, purchase order, and invoice summaries."
        actions={<a className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-300 px-4 text-sm font-semibold text-[#04100f]" href="mailto:billing@resovii.com"><Mail size={16} /> Contact Resovii billing</a>}
      />
      {isLoading ? <p className="text-sm text-slate-500">Loading account information...</p> : null}
      {error ? <p className="text-sm text-amber-200">Billing information is unavailable right now.</p> : null}
      {organization ? <>
        <section className="grid gap-4 md:grid-cols-3">
          <Summary label="Current plan" value={titleCase(organization.planCode)} />
          <Summary label="Contract status" value={titleCase(organization.subscriptionStatus)} />
          <Summary label="Renewal date" value={formatDate(organization.renewalDate)} />
        </section>
        <section className="grid gap-7 border-y border-white/[0.08] py-7 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Agreement</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
              <Detail label="Start" value={formatDate(organization.contractStartDate)} />
              <Detail label="End" value={formatDate(organization.contractEndDate)} />
              <Detail label="Purchase order" value={organization.purchaseOrderNumber ?? "Not recorded"} />
              <Detail label="Payment terms" value={organization.paymentTerms ?? "Not recorded"} />
            </dl>
          </div>
          <div>
            <p className="eyebrow">Billing contact</p>
            <p className="mt-4 text-sm font-semibold text-slate-200">{organization.billingContactName ?? "Billing contact not recorded"}</p>
            <p className="mt-1 text-sm text-slate-500">{organization.billingEmail ?? "Contact Resovii billing to update this information."}</p>
          </div>
        </section>
        <InvoiceTable invoices={data?.invoices ?? []} />
      </> : null}
    </div>
  );
}

function PlatformBillingPage() {
  const { csrfToken } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["platform-billing-organizations"],
    queryFn: () => getPlatformOrganizations(csrfToken ?? ""),
    enabled: Boolean(csrfToken),
  });
  async function transition(organizationId: string, action: "activate" | "restrict" | "suspend" | "restore") {
    if (!csrfToken) return;
    await transitionOrganization(organizationId, action, csrfToken);
    await refetch();
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Resovii internal"
        title="Organization access"
        description="Contract and invoice access controls for hospital organizations."
        actions={<span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-teal-300/20 bg-teal-300/[0.07] px-3 text-xs font-semibold text-teal-100"><ShieldCheck size={16} /> Internal controls</span>}
      />
      {isLoading ? <p className="text-sm text-slate-500">Loading organizations...</p> : null}
      <section className="overflow-x-auto border-y border-white/[0.08]">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-white/[0.08] text-xs uppercase tracking-[0.1em] text-slate-600"><tr><th className="px-3 py-4">Organization</th><th className="px-3 py-4">Plan</th><th className="px-3 py-4">Access</th><th className="px-3 py-4">Contract</th><th className="px-3 py-4">Actions</th></tr></thead>
          <tbody>{data?.organizations.map((organization) => <tr key={organization.id} className="border-b border-white/[0.06]"><td className="px-3 py-4 font-semibold text-slate-200">{organization.displayName ?? organization.legalName ?? "Unnamed organization"}</td><td className="px-3 py-4 text-slate-400">{titleCase(organization.planCode)}</td><td className="px-3 py-4 text-slate-400">{titleCase(organization.subscriptionStatus)}</td><td className="px-3 py-4 text-slate-500">{organization.contractEndDate ? formatDate(organization.contractEndDate) : "Not set"}</td><td className="px-3 py-4"><div className="flex gap-2"><Button size="sm" onClick={() => void transition(organization.id, "activate")}>Activate</Button><Button size="sm" variant="ghost" onClick={() => void transition(organization.id, "restrict")}>Restrict</Button></div></td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}

function InvoiceTable({ invoices }: { invoices: BillingSummary["invoices"] }) {
  return <section><div className="flex items-center gap-2"><FileText size={17} className="text-teal-300" /><h2 className="text-lg font-semibold text-white">Invoices</h2></div>{invoices.length ? <div className="mt-4 overflow-x-auto border-y border-white/[0.08]"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.1em] text-slate-600"><tr><th className="px-3 py-4">Invoice</th><th className="px-3 py-4">Due date</th><th className="px-3 py-4">Amount</th><th className="px-3 py-4">Status</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-t border-white/[0.06]"><td className="px-3 py-4 font-semibold text-slate-200">{invoice.invoiceNumber}</td><td className="px-3 py-4 text-slate-400">{formatDate(invoice.dueDate)}</td><td className="px-3 py-4 text-slate-400">{formatMoney(invoice.amountDue, invoice.currency)}</td><td className="px-3 py-4 text-slate-400">{titleCase(invoice.status)}</td></tr>)}</tbody></table></div> : <div className="mt-4 flex items-center gap-3 border-y border-white/[0.08] py-5 text-sm text-slate-500"><AlertCircle size={18} /> No invoices are available.</div>}</section>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="border-l-2 border-teal-300/50 pl-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">{label}</p><p className="mt-2 text-base font-semibold text-slate-100">{value}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">{label}</dt><dd className="mt-1 text-slate-300">{value}</dd></div>; }
