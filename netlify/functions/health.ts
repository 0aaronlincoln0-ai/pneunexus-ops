import type { Config } from "@netlify/functions";
import { json } from "./_shared/http";

export default (request: Request) => {
  if (request.method !== "GET") return json({ status: "not_found" }, { status: 404 });
  return json({ status: "ok", service: "pneunexus-ops", time: new Date().toISOString() });
};

export const config: Config = { path: "/api/health" };
