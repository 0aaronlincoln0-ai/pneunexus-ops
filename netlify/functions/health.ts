import type { Config } from "@netlify/functions";
import { json } from "./_shared/http";

function env(name: string): string | undefined {
  return process.env[name] ?? (typeof Netlify === "undefined" ? undefined : Netlify.env.get(name));
}

export default (request: Request) => {
  if (request.method !== "GET") return json({ status: "not_found" }, { status: 404 });
  const diagnosticModel = env("AI_DIAGNOSTIC_MODEL") ?? "gpt-5-mini";
  const realtimeModel = env("AI_REALTIME_MODEL") ?? "gpt-realtime-2.1";
  const hasOpenAiKey = Boolean(env("OPENAI_API_KEY"));
  const hasOpenAiGateway = Boolean(env("OPENAI_BASE_URL"));

  return json({
    status: "ok",
    service: "resovii",
    time: new Date().toISOString(),
    ai: {
      diagnostic: {
        configured: hasOpenAiKey || hasOpenAiGateway,
        model: diagnosticModel,
        provider: hasOpenAiGateway ? "netlify-ai-gateway" : hasOpenAiKey ? "openai" : "none",
      },
      realtime: {
        configured: hasOpenAiKey,
        model: realtimeModel,
        provider: hasOpenAiKey ? "openai" : "none",
      },
    },
  });
};

export const config: Config = { path: "/api/health" };
