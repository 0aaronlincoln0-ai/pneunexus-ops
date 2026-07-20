import type { Config } from "@netlify/functions";

function env(name: string): string | undefined {
  return process.env[name] ?? (typeof Netlify === "undefined" ? undefined : Netlify.env.get(name));
}

export default (request: Request) => {
  if (request.method !== "GET") return new Response("Not found", { status: 404 });

  const challenge = env("OPENAI_APPS_CHALLENGE");
  if (!challenge)
    return new Response("OpenAI app verification challenge is not configured.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  return new Response(challenge, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

export const config: Config = { path: "/.well-known/openai-apps-challenge" };
