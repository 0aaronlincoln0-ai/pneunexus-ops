import { getStore } from "@netlify/blobs";
import type { ServicePhoto, ServiceRecord } from "../src/lib/service-history";

const storeName = "resovii-service-memory";
const photoDataUrlPattern = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export interface ServiceMemoryRecordInput {
  reportedBy: string;
  title: string;
  equipment: string;
  location: string;
  symptom: string;
  resolution: string;
  followUp: string;
  instructions: string[];
  status: ServiceRecord["status"];
  photos: Array<{ name: string; dataUrl: string }>;
}

function serviceStore() {
  return getStore({ name: storeName, consistency: "strong" });
}

function recordsKey(organizationId: string) {
  return `orgs/${organizationId}/records.json`;
}

function photoPrefix(organizationId: string) {
  return `orgs/${organizationId}/photos/`;
}

function photoUrl(key: string) {
  return `/api/service-memory/photo?key=${encodeURIComponent(key)}`;
}

function safeName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function hydrateServiceRecordPhotos(record: ServiceRecord): ServiceRecord {
  return {
    ...record,
    photos: record.photos.map((photo) => ({
      ...photo,
      url: photo.url ?? (photo.id ? photoUrl(photo.id) : undefined),
    })),
  };
}

export async function listServiceMemoryRecords(organizationId: string): Promise<ServiceRecord[]> {
  const records = await serviceStore().get(recordsKey(organizationId), { type: "json" });
  if (!Array.isArray(records)) return [];
  return records.map((record) => hydrateServiceRecordPhotos(record as ServiceRecord));
}

export async function createServiceMemoryRecord(
  organizationId: string,
  input: ServiceMemoryRecordInput,
): Promise<ServiceRecord> {
  const store = serviceStore();
  const recordId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const photos: ServicePhoto[] = [];

  for (const photo of input.photos) {
    const match = photo.dataUrl.match(photoDataUrlPattern);
    if (!match) continue;
    const mimeType = match[1] ?? "image/jpeg";
    const base64 = match[2] ?? "";
    const photoId = crypto.randomUUID();
    const key = `${photoPrefix(organizationId)}${recordId}/${photoId}-${safeName(photo.name) || "photo.jpg"}`;
    const buffer = Buffer.from(base64, "base64");
    const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    await store.set(key, data, {
      metadata: {
        contentType: mimeType,
        filename: photo.name,
        recordId,
        organizationId,
        storedAt: createdAt,
      },
    });
    photos.push({
      id: key,
      name: photo.name,
      mimeType,
      url: photoUrl(key),
      storedAt: createdAt,
    });
  }

  const nextRecord: ServiceRecord = {
    id: recordId,
    createdAt,
    reportedBy: input.reportedBy,
    title: input.title,
    equipment: input.equipment,
    location: input.location,
    symptom: input.symptom,
    resolution: input.resolution,
    followUp: input.followUp,
    instructions: input.instructions,
    status: input.status,
    photos,
    videos: [],
  };
  const records = await listServiceMemoryRecords(organizationId);
  const nextRecords = [nextRecord, ...records].slice(0, 250);
  await store.setJSON(recordsKey(organizationId), nextRecords);
  return hydrateServiceRecordPhotos(nextRecord);
}

export async function readServiceMemoryPhoto(
  organizationId: string,
  key: string,
): Promise<{ data: ArrayBuffer; contentType: string; filename: string } | null> {
  if (!key.startsWith(photoPrefix(organizationId))) return null;
  const store = serviceStore();
  const [data, metadataResult] = await Promise.all([
    store.get(key, { type: "arrayBuffer" }),
    store.getMetadata(key),
  ]);
  if (!data) return null;
  const metadata = metadataResult?.metadata as
    | { contentType?: string; filename?: string; organizationId?: string }
    | undefined;
  if (metadata?.organizationId && metadata.organizationId !== organizationId) return null;
  return {
    data,
    contentType: metadata?.contentType ?? "application/octet-stream",
    filename: metadata?.filename ?? "service-photo",
  };
}

export function findServiceMemoryMatches(records: ServiceRecord[], query: string, limit = 3) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
  if (!terms.length) return [];
  return records
    .map((record) => {
      const searchable = [
        record.title,
        record.equipment,
        record.location,
        record.symptom,
        record.resolution,
        record.followUp,
        ...(record.instructions ?? []),
        ...record.photos.map((photo) => photo.name),
      ]
        .join(" ")
        .toLowerCase();
      return {
        record,
        score: terms.reduce((total, term) => total + Number(searchable.includes(term)), 0),
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ record }) => ({
      id: record.id,
      title: record.title,
      equipment: record.equipment,
      location: record.location,
      resolution: record.resolution,
      status: record.status,
      photoCount: record.photos.length,
      photoUrls: record.photos.slice(0, 3).map((photo) => photo.url).filter(Boolean),
    }));
}

export function serviceMemoryContext(records: ServiceRecord[], query: string) {
  const matches = findServiceMemoryMatches(records, query, 3);
  if (!matches.length) return "No matching service-memory records.";
  return matches
    .map(
      (match, index) =>
        `${index + 1}. ${match.title}\nEquipment: ${match.equipment}\nLocation: ${match.location}\nResolution: ${match.resolution}\nSaved photos: ${match.photoCount ?? 0}`,
    )
    .join("\n\n");
}
