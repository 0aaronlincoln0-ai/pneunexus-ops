import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, Stethoscope } from "lucide-react";
import { useState } from "react";
import { PageHeading } from "../components/QueryState";
import { VoiceDiagnosticAssistant } from "../components/VoiceDiagnosticAssistant";
import { useBootstrap } from "../hooks/useBootstrap";

export function TroubleshootingPage() {
  const bootstrap = useBootstrap();
  const devices = bootstrap.data?.devices ?? [];
  const [deviceId, setDeviceId] = useState("");
  const selectedDevice = devices.find((device) => device.id === deviceId);
  const deviceContext = selectedDevice
    ? `${selectedDevice.assetTag} ${selectedDevice.equipmentTag} ${selectedDevice.type} ${selectedDevice.operationalStatus}`
    : undefined;

  return (
    <>
      <PageHeading
        eyebrow="Main workspace"
        title="Pocket Technician"
        description="The AI technician for live pneumatic-tube troubleshooting. Describe the symptom, use voice or photos, and move one safe check at a time."
        action={
          <Link
            to="/information"
            hash="protocol-library"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 text-xs font-semibold text-slate-300 transition hover:border-teal-300/25 hover:text-teal-200"
          >
            <BookOpen size={16} /> Browse procedures <ChevronRight size={15} />
          </Link>
        }
      />

      {devices.length > 0 && (
        <section className="mb-6 flex flex-col gap-3 border-y border-white/[0.08] py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-end gap-3">
            <span className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
              <Stethoscope size={18} />
            </span>
            <label className="block w-full sm:max-w-md">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Affected equipment</span>
              <select
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#101821] px-3 text-base text-slate-100 outline-none focus:border-teal-300/30"
              >
                <option value="">No equipment selected</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.assetTag} - {device.equipmentTag}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Link
            to="/assets"
            className="inline-flex min-h-10 items-center text-xs font-semibold text-teal-200 hover:text-teal-100"
          >
            Review equipment records <ChevronRight size={15} />
          </Link>
        </section>
      )}

      <VoiceDiagnosticAssistant
        {...(deviceContext ? { deviceContext } : {})}
        {...(selectedDevice
          ? { deviceLabel: `${selectedDevice.assetTag} - ${selectedDevice.type}` }
          : {})}
      />
    </>
  );
}
