import type { Context } from "@netlify/functions";
import { ZodError } from "zod";
import { AuthorizationError } from "../../../server/security/capabilities";

export const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, { ...init, headers: { ...jsonHeaders, ...init.headers } });
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof ZodError)
    return json({ error: "Invalid request", issues: error.issues, requestId }, { status: 400 });
  if (error instanceof AuthorizationError)
    return json({ error: "Access denied", requestId }, { status: 403 });
  if (error instanceof HttpError)
    return json({ error: error.publicMessage, requestId }, { status: error.status });
  console.error(
    JSON.stringify({
      level: "error",
      event: "request.failed",
      requestId,
      errorType: error instanceof Error ? error.name : "unknown",
    }),
  );
  return json({ error: "The request could not be completed", requestId }, { status: 500 });
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly publicMessage: string,
  ) {
    super(publicMessage);
  }
}

export function requestId(context: Context): string {
  return context.requestId || crypto.randomUUID();
}

export function noPhiNotice() {
  return "No PHI. Do not enter patient, specimen, medication, or medical-record information. Automated detection is limited.";
}
