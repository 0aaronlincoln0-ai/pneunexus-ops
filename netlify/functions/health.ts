import type { Config } from "@netlify/functions";
import { json } from "./_shared/http";

function env(name: string): string | undefined {
  return process.env[name] ?? (typeof Netlify === "undefined" ? undefined : Netlify.env.get(name));
}

export default (request: Request) => {
  if (request.method !== "GET") return json({ status: "not_found" }, { status: 404 });
  const diagnosticModel = env("AI_DIAGNOSTIC_MODEL") ?? "gpt-5.6-sol";
  const realtimeModel = env("AI_REALTIME_MODEL") ?? "gpt-realtime-2.1";
  const openAiKey = env("OPENAI_API_KEY");
  const hasOpenAiKey = Boolean(openAiKey?.startsWith("sk-"));
  const hasOpenAiGateway = Boolean(env("OPENAI_BASE_URL"));
  const hasRuntimeOpenAiCredential = Boolean(openAiKey);
  const diagnosticProvider = hasOpenAiKey
    ? "openai"
    : hasOpenAiGateway
      ? "netlify-ai-gateway"
      : "none";

  return json({
    status: "ok",
    service: "resovii",
    time: new Date().toISOString(),
    ai: {
      diagnostic: {
        configured: hasOpenAiKey || hasOpenAiGateway || hasRuntimeOpenAiCredential,
        model: diagnosticModel,
        provider: diagnosticProvider,
        directOpenAiKeyConfigured: hasOpenAiKey,
        gatewayConfigured: hasOpenAiGateway,
      },
      realtime: {
        configured: hasRuntimeOpenAiCredential,
        model: realtimeModel,
        provider: hasRuntimeOpenAiCredential ? "openai" : "none",
      },
    },
  });
};

export const config: Config = { path: "/api/health" };
