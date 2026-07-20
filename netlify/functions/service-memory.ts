import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import {
  createServiceMemoryRecord,
  listServiceMemoryRecords,
  readServiceMemoryPhoto,
} from "../../server/service-memory";
import { capabilities, requireCapability } from "../../server/security/capabilities";
import { detectProhibitedContent } from "../../server/security/validation";
import { errorResponse, HttpError, json, requestId } from "./_shared/http";
import { authenticateRequest } from "./_shared/session";

const photoInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  dataUrl: z
    .string()
    .max(1_800_000)
    .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
});

const recordInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  equipment: z.string().trim().max(160).default("Equipment not entered"),
  location: z.string().trim().max(160).default("Location not entered"),
  symptom: z.string().trim().min(2).max(2_000),
  resolution: z.string().trim().min(2).max(2_000),
  followUp: z.string().trim().max(1_200).default("No follow-up recorded."),
  instructions: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  status: z.enum(["resolved", "monitoring", "open"]).default("resolved"),
  photos: z.array(photoInputSchema).max(8).default([]),
});

function isAdministrator(role: string | undefined) {
  return ["organization_admin", "network_admin", "platform_super_admin"].includes(role ?? "");
}

export default async (request: Request, context: Context) => {
  const id = requestId(context);
  try {
    const url = new URL(request.url);
    const { principal, displayName } = await authenticateRequest(
      request,
      request.method !== "GET",
      true,
    );
    requireCapability(principal.permissions, capabilities.dashboardRead);

    if (url.pathname.endsWith("/photo")) {
      if (request.method !== "GET")
        return json({ error: "Method not allowed", requestId: id }, { status: 405 });
      const key = url.searchParams.get("key") ?? "";
      if (!key) throw new HttpError(400, "Photo key is required");
      const photo = await readServiceMemoryPhoto(principal.organizationId, key);
      if (!photo) throw new HttpError(404, "Photo not found");
      return new Response(photo.data, {
        headers: {
          "Content-Type": photo.contentType,
          "Content-Disposition": `inline; filename="${photo.filename.replaceAll('"', "")}"`,
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          "Cross-Origin-Resource-Policy": "same-origin",
        },
      });
    }

    if (request.method === "GET") {
      return json({ records: await listServiceMemoryRecords(principal.organizationId) });
    }

    if (request.method === "POST") {
      if (!isAdministrator(principal.roleKey)) throw new HttpError(403, "Administrator access required");
      const input = recordInputSchema.parse(await request.json());
      const warnings = [
        input.title,
        input.equipment,
        input.location,
        input.symptom,
        input.resolution,
        input.followUp,
        ...input.instructions,
        ...input.photos.map((photo) => photo.name),
      ].flatMap(detectProhibitedContent);
      if (warnings.length)
        throw new HttpError(
          422,
          "Remove patient, specimen, medication, label, or medical-record information before saving service memory.",
        );
      const record = await createServiceMemoryRecord(principal.organizationId, {
        ...input,
        reportedBy: displayName,
      });
      return json({ record }, { status: 201 });
    }

    return json({ error: "Method not allowed", requestId: id }, { status: 405 });
  } catch (error) {
    return errorResponse(error, id);
  }
};

export const config: Config = {
  path: ["/api/service-memory", "/api/service-memory/photo"],
};
