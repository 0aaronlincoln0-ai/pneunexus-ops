import { KeyRound, LoaderCircle, Save, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../auth";
import { PageHeading } from "../components/QueryState";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import * as api from "../lib/api";
import type { OwnerAiSettingsStatus } from "../lib/api";

function isOwner(role: string | undefined) {
  return ["organization_admin", "platform_super_admin"].includes(role ?? "");
}

export function OwnerSettingsPage() {
  const { user, csrfToken } = useAuth();
  const [settings, setSettings] = useState<OwnerAiSettingsStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-5-mini");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api
      .getOwnerSettings()
      .then(({ ai }) => {
        if (!active) return;
        setSettings(ai);
        setModel(ai.model);
        setEnabled(ai.enabled || !ai.configured);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Owner settings could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  if (!isOwner(user?.role)) {
    return (
      <PageHeading
        eyebrow="Owner settings"
        title="Owner access required"
        description="Only the workspace owner or platform administrator can change the AI API key."
      />
    );
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { ai } = await api.saveOwnerAiSettings({ apiKey, enabled, model }, csrfToken);
      setSettings(ai);
      setApiKey("");
      setMessage("OpenAI API key saved. Pocket Technician will use it for every user.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The API key could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled() {
    if (!csrfToken || !settings?.configured) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { ai } = await api.setOwnerAiEnabled(!settings.enabled, csrfToken);
      setSettings(ai);
      setEnabled(ai.enabled);
      setMessage(ai.enabled ? "Owner API key enabled." : "Owner API key disabled.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The setting could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Owner settings"
        title="AI API settings"
        description="Save the OpenAI API key Pocket Technician should use for every user in this Resovii workspace."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-teal-300/15 bg-teal-300/[0.05] px-3.5 py-2.5 text-[11px] font-semibold text-teal-200">
            <ShieldCheck size={15} /> Owner controlled
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">OpenAI API key</h2>
              <p className="mt-1 text-sm text-slate-500">
                The key is encrypted on the server and is never shown back in the browser.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={(event) => void saveSettings(event)}>
            <label className="block text-sm font-semibold text-slate-300">
              API key
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                autoComplete="off"
                placeholder="sk-..."
                className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-base text-slate-100 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-300">
              Model
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-base text-slate-100 outline-none focus:border-teal-300/30"
              />
            </label>

            <button
              type="button"
              onClick={() => setEnabled((value) => !value)}
              className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left text-sm text-slate-300"
            >
              <span>
                <span className="block font-semibold text-white">Use this key for Pocket Technician</span>
                <span className="mt-1 block text-xs text-slate-500">
                  Applies to every user in this workspace.
                </span>
              </span>
              {enabled ? <ToggleRight className="text-teal-300" size={30} /> : <ToggleLeft size={30} />}
            </button>

            <Button disabled={busy || !apiKey.trim()} type="submit" className="min-h-12">
              {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />}
              Save API key
            </Button>
          </form>

          {message && (
            <div className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100">
              {error}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-300/70">
            Current status
          </p>
          <div className="mt-5 space-y-4 text-sm">
            <StatusRow label="Configured" value={settings?.configured ? "Yes" : "No"} />
            <StatusRow label="Enabled" value={settings?.enabled ? "Yes" : "No"} />
            <StatusRow label="Model" value={settings?.model ?? model} />
            <StatusRow
              label="Key"
              value={settings?.keyLastFour ? `Ending in ${settings.keyLastFour}` : "Not saved"}
            />
            <StatusRow label="Updated by" value={settings?.updatedBy ?? "Not saved"} />
          </div>
          {settings?.configured && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              className="mt-6 w-full"
              onClick={() => void toggleEnabled()}
            >
              {settings.enabled ? "Disable owner key" : "Enable owner key"}
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-200">{value}</span>
    </div>
  );
}
