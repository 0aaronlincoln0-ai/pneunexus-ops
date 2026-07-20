import {
  Camera,
  CheckCircle2,
  ClipboardPlus,
  FileText,
  Film,
  ImagePlus,
  ListChecks,
  MapPin,
  Maximize2,
  Play,
  Search,
  ShieldCheck,
  X,
  ZoomIn,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth";
import { PageHeading } from "../components/QueryState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import * as api from "../lib/api";
import {
  loadServiceHistory,
  loadServiceVideos,
  saveServiceHistory,
  saveServiceVideos,
  serviceStatusLabel,
  type ServicePhoto,
  type ServiceRecord,
  type ServiceVideo,
} from "../lib/service-history";
import { cn } from "../lib/utils";

const statusStyle: Record<ServiceRecord["status"], string> = {
  resolved: "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200",
  monitoring: "border-amber-300/15 bg-amber-300/[0.06] text-amber-200",
  open: "border-red-300/15 bg-red-300/[0.06] text-red-200",
};

const emptyForm = {
  title: "",
  equipment: "",
  location: "",
  symptom: "",
  resolution: "",
  followUp: "",
  instructions: "",
  status: "resolved" as ServiceRecord["status"],
};

const maxPhotosPerServiceCall = 8;
const maxVideosPerServiceCall = 3;
const maxVideoBytes = 20_000_000;

function isAdministrator(role: string | undefined) {
  return ["organization_admin", "network_admin", "platform_super_admin"].includes(role ?? "");
}

export function AdminServicePage() {
  const { user, csrfToken } = useAuth();
  const [records, setRecords] = useState<ServiceRecord[]>(loadServiceHistory);
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [videos, setVideos] = useState<ServiceVideo[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const videoInput = useRef<HTMLInputElement | null>(null);
  const initialRecords = useRef(records);

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) =>
      [record.title, record.equipment, record.location, record.symptom, record.resolution]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, records]);
  const selectedRecord = records.find((record) => record.id === selectedRecordId) ?? null;
  const photoSlotsAvailable = Math.max(0, maxPhotosPerServiceCall - photos.length);
  const videoSlotsAvailable = Math.max(0, maxVideosPerServiceCall - videos.length);

  useEffect(() => {
    let active = true;
    void api
      .getServiceMemoryRecords()
      .then(({ records: storedRecords }) =>
        Promise.all(
          storedRecords.map(async (record) => ({
            ...record,
            videos: await loadServiceVideos(record.id, record.videos),
          })),
        ),
      )
      .then((hydrated) => {
        if (!active) return;
        setRecords(hydrated);
        saveServiceHistory(hydrated);
      })
      .catch(() =>
        Promise.all(
          initialRecords.current.map(async (record) => ({
            ...record,
            videos: await loadServiceVideos(record.id, record.videos),
          })),
        ).then((hydrated) => {
          if (active) setRecords(hydrated);
        }),
      );
    return () => {
      active = false;
    };
  }, []);

  if (!isAdministrator(user?.role)) {
    return (
      <PageHeading
        eyebrow="Administrator workspace"
        title="Administrator access required"
        description="This workspace is reserved for organization, network, and platform administrators."
      />
    );
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    const accepted = files.filter(
      (file) => file.type.startsWith("image/") && file.size <= 4_000_000,
    );
    const available = maxPhotosPerServiceCall - photos.length;
    if (accepted.length !== files.length || accepted.length > available) {
      setError(
        `Use up to ${maxPhotosPerServiceCall} image files, 4 MB each. Photos must not include patient, specimen, label, or other private health information.`,
      );
    } else {
      setError(null);
    }
    const next = await Promise.all(accepted.slice(0, Math.max(0, available)).map(fileToPhoto));
    setPhotos((current) => [...current, ...next]);
  }

  async function addVideos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    const accepted = files.filter(
      (file) =>
        ["video/mp4", "video/webm", "video/quicktime"].includes(file.type) &&
        file.size <= maxVideoBytes,
    );
    const available = maxVideosPerServiceCall - videos.length;
    if (accepted.length !== files.length || accepted.length > available) {
      setError(
        `Use up to ${maxVideosPerServiceCall} MP4, WebM, or MOV clips, 20 MB each. Videos must show equipment only and must not include private health information.`,
      );
    } else {
      setError(null);
    }
    const next = await Promise.all(
      accepted.slice(0, Math.max(0, available)).map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        dataUrl: await fileToDataUrl(file),
        mimeType: file.type,
      })),
    );
    setVideos((current) => [...current, ...next]);
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.symptom.trim() || !form.resolution.trim()) {
      setError("Add a service-call title, the observed problem, and the resolution before saving.");
      return;
    }
    const draft: ServiceRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      reportedBy: user?.displayName ?? "Administrator",
      title: form.title.trim(),
      equipment: form.equipment.trim() || "Equipment not entered",
      location: form.location.trim() || "Location not entered",
      symptom: form.symptom.trim(),
      resolution: form.resolution.trim(),
      followUp: form.followUp.trim() || "No follow-up recorded.",
      instructions: form.instructions
        .split("\n")
        .map((instruction) => instruction.trim())
        .filter(Boolean),
      status: form.status,
      photos,
      videos: videos.map(({ id, name, mimeType }) => ({ id, name, mimeType })),
    };
    try {
      const photosForUpload = photos
        .filter((photo): photo is ServicePhoto & { dataUrl: string } => Boolean(photo.dataUrl))
        .map(({ name, dataUrl }) => ({ name, dataUrl }));
      const saved = csrfToken
        ? await api.createServiceMemoryRecord(
            {
              title: draft.title,
              equipment: draft.equipment,
              location: draft.location,
              symptom: draft.symptom,
              resolution: draft.resolution,
              followUp: draft.followUp,
              instructions: draft.instructions ?? [],
              status: draft.status,
              photos: photosForUpload,
            },
            csrfToken,
          )
        : { record: draft };
      const savedRecord: ServiceRecord = { ...saved.record, videos: draft.videos ?? [] };
      saveServiceHistory([savedRecord, ...records]);
      await saveServiceVideos(savedRecord.id, videos);
      setRecords([savedRecord, ...records]);
      setForm(emptyForm);
      setPhotos([]);
      setVideos([]);
      setError(null);
      setSelectedRecordId(savedRecord.id);
    } catch {
      saveServiceHistory(records);
      setError(
        "The service record could not be saved permanently. Reduce photo size or count and try again.",
      );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Administrator service intelligence"
        title="Administrator workspace"
        description="Capture what failed, what solved it, the equipment and location involved, follow-up required, and equipment photos. Pocket Technician can use these permanent service-memory records during troubleshooting."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-teal-300/15 bg-teal-300/[0.05] px-3.5 py-2.5 text-[11px] font-semibold text-teal-200">
            <ShieldCheck size={15} /> Administrator workspace
          </div>
        }
      />

      <nav
        className="mb-6 flex gap-2 overflow-x-auto border-b border-white/[0.06] pb-3"
        aria-label="Administrator sections"
      >
        <a
          href="#new-service-call"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-300/[0.07] px-3.5 text-xs font-semibold text-teal-100"
        >
          <ClipboardPlus size={16} /> New service call
        </a>
        <a
          href="#service-history"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 text-xs font-semibold text-slate-400 transition hover:border-white/[0.14] hover:text-slate-200"
        >
          <Search size={16} /> Service history
        </a>
      </nav>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section id="new-service-call" className="scroll-mt-28 space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
                  <ClipboardPlus size={19} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Record a service-call resolution
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Save the facts another technician needs to avoid starting from zero.
                  </p>
                </div>
              </div>
            </div>
            <form className="space-y-5 p-5 sm:p-6" onSubmit={saveRecord}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Service call title"
                  value={form.title}
                  onChange={(title) => setForm((current) => ({ ...current, title }))}
                  placeholder="Example: Intermittent carrier arrival"
                />
                <Field
                  label="Equipment tag"
                  value={form.equipment}
                  onChange={(equipment) => setForm((current) => ({ ...current, equipment }))}
                  placeholder="Example: STA-014"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <Field
                  label="Location"
                  value={form.location}
                  onChange={(location) => setForm((current) => ({ ...current, location }))}
                  placeholder="Building, floor, department"
                />
                <label className="block">
                  <span className="text-xs font-semibold text-slate-200">Current status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as ServiceRecord["status"],
                      }))
                    }
                    className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-[#101821] px-3 text-sm text-slate-100 outline-none focus:border-teal-300/30"
                  >
                    <option value="resolved">Resolved</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="open">Open</option>
                  </select>
                </label>
              </div>
              <TextArea
                label="Observed problem"
                value={form.symptom}
                onChange={(symptom) => setForm((current) => ({ ...current, symptom }))}
                placeholder="What did the technician observe, including exact fault text, route, device state, and what did or did not move?"
              />
              <TextArea
                label="Resolution and verification"
                value={form.resolution}
                onChange={(resolution) => setForm((current) => ({ ...current, resolution }))}
                placeholder="What was corrected, what part or adjustment was made, and how was return to service verified?"
              />
              <TextArea
                label="Follow-up / parts needed"
                value={form.followUp}
                onChange={(followUp) => setForm((current) => ({ ...current, followUp }))}
                placeholder="Monitoring window, parts on order, owner, or next action"
                rows={2}
              />
              <TextArea
                label="Attached field instructions"
                value={form.instructions}
                onChange={(instructions) => setForm((current) => ({ ...current, instructions }))}
                placeholder="One instruction per line: required verification, safety boundary, parts instruction, or escalation condition"
                rows={3}
              />

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Evidence attachments</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-600">
                      Add equipment-only photos or original-quality video clips for case review. Do
                      not upload private health information.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => photoInput.current?.click()}
                      disabled={photoSlotsAvailable === 0}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3.5 text-xs font-semibold text-slate-300 transition hover:border-teal-300/25 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ImagePlus size={16} />
                      {photoSlotsAvailable
                        ? `Add photos (${photoSlotsAvailable} left)`
                        : "Photo limit reached"}
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInput.current?.click()}
                      disabled={videoSlotsAvailable === 0}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-300/20 bg-teal-300/[0.05] px-3.5 text-xs font-semibold text-teal-100 transition hover:border-teal-300/35 hover:bg-teal-300/[0.09] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Film size={16} />
                      {videoSlotsAvailable
                        ? `Add videos (${videoSlotsAvailable} left)`
                        : "Video limit reached"}
                    </button>
                    <input
                      ref={photoInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={(event) => void addPhotos(event)}
                    />
                    <input
                      ref={videoInput}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={(event) => void addVideos(event)}
                    />
                  </div>
                </div>
                {photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {photos.map((photo, index) => (
                      <div
                        key={`${photo.name}-${index}`}
                        className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#070c12]"
                      >
                        <img
                          src={photo.dataUrl ?? photo.url}
                          alt={photo.name}
                          className="aspect-[4/3] w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPhotos((current) =>
                              current.filter((_, photoIndex) => photoIndex !== index),
                            )
                          }
                          className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-lg bg-black/70 text-white"
                          aria-label={`Remove ${photo.name}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {videos.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {videos.map((video, index) => (
                      <div
                        key={`${video.name}-${index}`}
                        className="relative overflow-hidden rounded-xl border border-teal-300/15 bg-black"
                      >
                        <video
                          src={video.dataUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="aspect-video w-full object-contain"
                        />
                        <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-[#070c12] px-3 py-2.5">
                          <span className="min-w-0 truncate text-xs text-slate-400">
                            {video.name}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setVideos((current) =>
                                current.filter((_, videoIndex) => videoIndex !== index),
                              )
                            }
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-slate-300 transition hover:bg-red-300/[0.12] hover:text-red-100"
                            aria-label={`Remove ${video.name}`}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-300/20 bg-red-300/[0.06] px-3.5 py-3 text-xs leading-5 text-red-100"
                >
                  {error}
                </p>
              )}
              <Button type="submit">
                <CheckCircle2 size={17} /> Save service resolution
              </Button>
            </form>
          </Card>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-28">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
                <Camera size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">What makes a useful record</p>
                <p className="mt-1 text-xs text-slate-600">Make the next visit shorter.</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-xs leading-5 text-slate-500">
              <li>Use exact equipment tags and a specific physical location.</li>
              <li>Describe the observed symptom before the fix.</li>
              <li>Record the part, adjustment, and return-to-service result.</li>
              <li>Attach clear equipment-only photos when they add context.</li>
            </ul>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <MapPin size={17} className="text-teal-300" />
              <p className="text-sm font-semibold text-slate-200">Service history</p>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {records.length} resolution records are available in this workspace.
            </p>
          </Card>
        </aside>
      </div>

      <Card id="service-history" className="mt-6 scroll-mt-28 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="eyebrow">Past service calls</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Resolution history</h2>
          </div>
          <label className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-600" />
            <span className="sr-only">Search service history</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search issue, equipment, or fix"
              className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] pl-10 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
            />
          </label>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {filteredRecords.map((record) => (
            <ServiceHistoryRow
              key={record.id}
              record={record}
              onOpen={() => setSelectedRecordId(record.id)}
            />
          ))}
          {filteredRecords.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">
              No service records match this search.
            </p>
          )}
        </div>
      </Card>
      {selectedRecord && (
        <ServiceCaseDialog record={selectedRecord} onClose={() => setSelectedRecordId(null)} />
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-200">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 text-base text-slate-100 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-200">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-base leading-6 text-slate-100 outline-none placeholder:text-slate-700 focus:border-teal-300/30"
      />
    </label>
  );
}

function ServiceHistoryRow({ record, onOpen }: { record: ServiceRecord; onOpen: () => void }) {
  const videos = record.videos ?? [];
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open service call: ${record.title}`}
      className="cursor-pointer p-4 transition hover:bg-white/[0.018] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300/70 sm:p-5"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white sm:text-base">{record.title}</h3>
            <Badge className={cn(statusStyle[record.status], "border")}>
              {serviceStatusLabel(record.status)}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {record.equipment} · {record.location} ·{" "}
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
              new Date(record.createdAt),
            )}{" "}
            · {record.reportedBy}
          </p>
          <span className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-teal-300/15 bg-teal-300/[0.05] px-3 text-xs font-semibold text-teal-200">
            View case <Search size={14} />
          </span>
        </div>
        {(record.photos.length > 0 || videos.length > 0) && (
          <div className="flex items-center gap-1.5">
            {videos.length > 0 && (
              <span className="relative grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-teal-300/20 bg-teal-300/[0.06] text-teal-200">
                <Film size={17} />
                <span className="absolute bottom-0 right-0 rounded-tl-md bg-[#07110f] px-1 py-0.5 text-[9px] font-bold">
                  {videos.length}
                </span>
              </span>
            )}
            <div className="flex -space-x-2">
              {record.photos.slice(0, 3).map((photo, index) => (
                <img
                  key={`${photo.name}-${index}`}
                  src={photo.dataUrl ?? photo.url}
                  alt={`${record.title} evidence`}
                  className="h-10 w-10 rounded-lg border-2 border-[#0b1119] object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="hidden">
        <RecordDetail label="Observed problem" value={record.symptom} />
        <RecordDetail label="Resolution and verification" value={record.resolution} />
      </div>
      <p className="hidden">
        <strong className="text-slate-300">Follow-up:</strong> {record.followUp}
      </p>
    </article>
  );
}

function RecordDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-300/65">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{value}</p>
    </div>
  );
}

function ServiceCaseDialog({ record, onClose }: { record: ServiceRecord; onClose: () => void }) {
  const instructions = record.instructions ?? [];
  const videos = record.videos ?? [];
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const selectedPhoto =
    selectedPhotoIndex === null ? null : (record.photos[selectedPhotoIndex] ?? null);
  const selectedVideo = selectedVideoIndex === null ? null : (videos[selectedVideoIndex] ?? null);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-case-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <Card className="max-h-[94dvh] w-full max-w-5xl overflow-hidden rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">Service-call detail</p>
              <Badge className={cn(statusStyle[record.status], "border")}>
                {serviceStatusLabel(record.status)}
              </Badge>
            </div>
            <h2
              id="service-case-title"
              className="mt-2 text-xl font-semibold text-white sm:text-2xl"
            >
              {record.title}
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {record.equipment} - {record.location} - Recorded by {record.reportedBy}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
            aria-label="Close service call detail"
          >
            <X size={19} />
          </button>
        </div>
        <div className="max-h-[calc(94dvh-10rem)] space-y-6 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <CaseSection icon={FileText} title="Observed problem" detail={record.symptom} />
            <CaseSection
              icon={CheckCircle2}
              title="Resolution and verification"
              detail={record.resolution}
            />
          </div>
          <CaseSection icon={ClipboardPlus} title="Follow-up and parts" detail={record.followUp} />

          <section className="rounded-xl border border-teal-300/15 bg-teal-300/[0.035] p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-300/[0.08] text-teal-300">
                <ListChecks size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Attached field instructions</p>
                <p className="mt-1 text-xs text-slate-500">Requirements captured with this case.</p>
              </div>
            </div>
            {instructions.length ? (
              <ol className="mt-5 space-y-3">
                {instructions.map((instruction, index) => (
                  <li key={instruction} className="flex gap-3 text-sm leading-6 text-slate-300">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-teal-300/15 bg-teal-300/[0.06] text-[10px] font-bold text-teal-300">
                      {index + 1}
                    </span>
                    {instruction}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No additional field instructions were attached to this service call.
              </p>
            )}
          </section>

          <section>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300">
                <Camera size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Attached photos</p>
                <p className="mt-1 text-xs text-slate-500">
                  {record.photos.length} equipment photo{record.photos.length === 1 ? "" : "s"}{" "}
                  saved with this case.
                </p>
              </div>
            </div>
            {record.photos.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {record.photos.map((photo, index) => (
                  <button
                    key={`${photo.name}-${index}`}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(index)}
                    className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#070c12] text-left transition hover:border-teal-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70"
                    aria-label={`View full-size photo: ${photo.name}`}
                  >
                    <span className="relative block aspect-[4/3] bg-black/30">
                      <img
                        src={photo.dataUrl ?? photo.url}
                        alt={`${record.title}: ${photo.name}`}
                        className="h-full w-full object-contain"
                      />
                      <span className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-xl bg-black/65 text-white opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                        <ZoomIn size={17} />
                      </span>
                    </span>
                    <span className="block truncate px-3 py-2.5 text-xs text-slate-500">
                      {photo.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/[0.1] p-5 text-sm text-slate-600">
                No equipment photos were attached to this service call.
              </div>
            )}
          </section>
          <section>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300">
                <Film size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Attached videos</p>
                <p className="mt-1 text-xs text-slate-500">
                  {videos.length} equipment video{videos.length === 1 ? "" : "s"} saved with this
                  case.
                </p>
              </div>
            </div>
            {videos.length ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {videos.map((video, index) => (
                  <div
                    key={`${video.name}-${index}`}
                    className="overflow-hidden rounded-xl border border-teal-300/15 bg-black"
                  >
                    <div className="relative aspect-video">
                      <video
                        src={video.dataUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedVideoIndex(index)}
                        className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-xl bg-black/70 text-white transition hover:bg-black"
                        aria-label={`Open full-screen video: ${video.name}`}
                      >
                        <Maximize2 size={17} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 border-t border-white/[0.08] bg-[#070c12] px-3 py-2.5">
                      <Play size={14} className="shrink-0 text-teal-300" />
                      <p className="truncate text-xs text-slate-400">{video.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/[0.1] p-5 text-sm text-slate-600">
                No equipment videos were attached to this service call.
              </div>
            )}
          </section>
        </div>
      </Card>
      {selectedPhoto && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 p-3 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Full-size photo: ${selectedPhoto.name}`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedPhotoIndex(null);
          }}
        >
          <figure className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-[#070c12]">
            <div className="relative min-h-0 flex-1 bg-black">
              <img
                src={selectedPhoto.dataUrl ?? selectedPhoto.url}
                alt={`${record.title}: ${selectedPhoto.name}`}
                className="max-h-[78dvh] w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setSelectedPhotoIndex(null)}
                className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-xl bg-black/75 text-white transition hover:bg-black"
                aria-label="Close full-size photo"
              >
                <X size={19} />
              </button>
            </div>
            <figcaption className="truncate border-t border-white/[0.08] px-4 py-3 text-sm text-slate-300">
              {selectedPhoto.name}
            </figcaption>
          </figure>
        </div>
      )}
      {selectedVideo && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 p-3 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Full-screen video: ${selectedVideo.name}`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedVideoIndex(null);
          }}
        >
          <figure className="flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-[#070c12]">
            <div className="relative aspect-video bg-black">
              <video
                src={selectedVideo.dataUrl}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setSelectedVideoIndex(null)}
                className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-xl bg-black/75 text-white transition hover:bg-black"
                aria-label="Close full-screen video"
              >
                <X size={19} />
              </button>
            </div>
            <figcaption className="truncate border-t border-white/[0.08] px-4 py-3 text-sm text-slate-300">
              {selectedVideo.name}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

function CaseSection({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof FileText;
  title: string;
  detail: string;
}) {
  return (
    <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-teal-300">
          <Icon size={17} />
        </span>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{detail}</p>
    </section>
  );
}

function fileToPhoto(file: File): Promise<ServicePhoto> {
  return fileToDataUrl(file).then((dataUrl) => ({ name: file.name, dataUrl }));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
