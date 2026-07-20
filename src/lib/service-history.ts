export interface ServicePhoto {
  name: string;
  dataUrl: string;
}

export interface ServiceVideo {
  id: string;
  name: string;
  mimeType: string;
  dataUrl?: string;
}

export interface ServiceRecord {
  id: string;
  createdAt: string;
  reportedBy: string;
  title: string;
  equipment: string;
  location: string;
  symptom: string;
  resolution: string;
  followUp: string;
  instructions?: string[];
  status: "resolved" | "monitoring" | "open";
  photos: ServicePhoto[];
  videos?: ServiceVideo[];
}

export interface ServiceKnowledgeMatch {
  id: string;
  title: string;
  equipment: string;
  location: string;
  resolution: string;
  status: ServiceRecord["status"];
}

const storageKey = "resovii-service-history-v2";
const legacyStorageKey = "pneunexus-service-history-v2";
const videoDatabaseName = "resovii-service-videos-v1";
const videoStoreName = "videos";

export function loadServiceHistory(): ServiceRecord[] {
  try {
    const saved = localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as ServiceRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveServiceHistory(records: ServiceRecord[]) {
  // Video data stays in IndexedDB so localStorage only carries service record metadata.
  const serializable = records.map((record) => ({
    ...record,
    videos: record.videos?.map(({ id, name, mimeType }) => ({ id, name, mimeType })),
  }));
  localStorage.setItem(storageKey, JSON.stringify(serializable));
}

export async function saveServiceVideos(recordId: string, videos: ServiceVideo[]) {
  if (!videos.length) return;
  const database = await openVideoDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(videoStoreName, "readwrite");
    const store = transaction.objectStore(videoStoreName);
    for (const video of videos) {
      store.put({ ...video, recordId });
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
}

export async function loadServiceVideos(recordId: string, videos: ServiceVideo[] = []) {
  if (!videos.length || typeof indexedDB === "undefined") return videos;
  const database = await openVideoDatabase();
  const hydrated = await Promise.all(
    videos.map(
      (video) =>
        new Promise<ServiceVideo>((resolve) => {
          const request = database
            .transaction(videoStoreName, "readonly")
            .objectStore(videoStoreName)
            .get(video.id);
          request.onsuccess = () => {
            const stored = request.result as (ServiceVideo & { recordId: string }) | undefined;
            resolve(
              stored?.recordId === recordId && stored.dataUrl
                ? { ...video, dataUrl: stored.dataUrl }
                : video,
            );
          };
          request.onerror = () => resolve(video);
        }),
    ),
  );
  database.close();
  return hydrated;
}

function openVideoDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(videoDatabaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(videoStoreName)) {
        request.result.createObjectStore(videoStoreName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function serviceStatusLabel(status: ServiceRecord["status"]) {
  return status === "resolved" ? "Resolved" : status === "monitoring" ? "Monitoring" : "Open";
}

export function findServiceKnowledge(query: string, limit = 3): ServiceKnowledgeMatch[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
  if (!terms.length) return [];
  return loadServiceHistory()
    .map((record) => {
      const searchable = [
        record.title,
        record.equipment,
        record.location,
        record.symptom,
        record.resolution,
        record.followUp,
        ...(record.instructions ?? []),
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
    }));
}
