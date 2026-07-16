import { z } from "zod";

export const uuid = z.string().uuid();

export const createDeviceSchema = z.object({
  campusId: uuid,
  buildingId: uuid,
  floorId: uuid,
  systemId: uuid,
  zoneId: uuid.nullable().optional(),
  deviceTypeId: uuid,
  manufacturerId: uuid,
  assetTag: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9-]+$/i),
  equipmentTag: z.string().trim().min(2).max(80),
  operationalStatus: z.enum(["operational", "degraded", "offline", "retired"]),
  criticality: z.enum(["low", "medium", "high", "critical"]),
  serialNumber: z.string().trim().max(100).nullable().optional(),
  firmwareVersion: z.string().trim().max(100).nullable().optional(),
});

const prohibitedPatterns = [
  {
    name: "possible date of birth",
    pattern: /\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2}\b/i,
  },
  {
    name: "possible medical record number",
    pattern: /\b(?:MRN|medical record)\s*[:#-]?\s*[A-Z0-9-]{5,20}\b/i,
  },
  { name: "possible patient identifier", pattern: /\bpatient\s*(?:id|name)\s*[:#-]/i },
];

export function detectProhibitedContent(value: string): string[] {
  return prohibitedPatterns.filter(({ pattern }) => pattern.test(value)).map(({ name }) => name);
}
