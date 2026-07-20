import { getStore } from "@netlify/blobs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const storeName = "resovii-owner-ai-settings";
const defaultModel = "gpt-5-mini";

interface StoredOwnerAiSettings {
  enabled: boolean;
  model: string;
  encryptedApiKey: string;
  iv: string;
  authTag: string;
  keyLastFour: string;
  updatedAt: string;
  updatedBy: string;
}

export interface OwnerAiSettingsStatus {
  enabled: boolean;
  configured: boolean;
  model: string;
  keyLastFour: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

function env(name: string): string | undefined {
  return process.env[name] ?? (typeof Netlify === "undefined" ? undefined : Netlify.env.get(name));
}

function settingsStore() {
  return getStore({ name: storeName, consistency: "strong" });
}

function settingsKey(organizationId: string) {
  return `orgs/${organizationId}/ai-settings.json`;
}

function encryptionKey() {
  const secret = env("SESSION_SECRET");
  if (!secret) throw new Error("SESSION_SECRET is required before owner AI settings can be saved.");
  return createHash("sha256").update(secret).digest();
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    encryptedApiKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptSecret(settings: StoredOwnerAiSettings) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(settings.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(settings.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(settings.encryptedApiKey, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function statusFromStored(settings: StoredOwnerAiSettings | null): OwnerAiSettingsStatus {
  return {
    enabled: Boolean(settings?.enabled),
    configured: Boolean(settings?.encryptedApiKey),
    model: settings?.model ?? defaultModel,
    keyLastFour: settings?.keyLastFour ?? null,
    updatedAt: settings?.updatedAt ?? null,
    updatedBy: settings?.updatedBy ?? null,
  };
}

export async function getOwnerAiSettingsStatus(
  organizationId: string,
): Promise<OwnerAiSettingsStatus> {
  const settings = await settingsStore().get(settingsKey(organizationId), { type: "json" });
  return statusFromStored((settings as StoredOwnerAiSettings | null) ?? null);
}

export async function saveOwnerAiSettings(input: {
  organizationId: string;
  apiKey: string;
  enabled: boolean;
  model?: string;
  updatedBy: string;
}) {
  const cleanedKey = input.apiKey.trim();
  if (!cleanedKey.startsWith("sk-")) throw new Error("OpenAI API key must start with sk-.");
  const encrypted = encryptSecret(cleanedKey);
  const settings: StoredOwnerAiSettings = {
    enabled: input.enabled,
    model: input.model?.trim() || defaultModel,
    ...encrypted,
    keyLastFour: cleanedKey.slice(-4),
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy,
  };
  await settingsStore().setJSON(settingsKey(input.organizationId), settings);
  return statusFromStored(settings);
}

export async function setOwnerAiEnabled(input: {
  organizationId: string;
  enabled: boolean;
  updatedBy: string;
}) {
  const existing = await settingsStore().get(settingsKey(input.organizationId), { type: "json" });
  const settings = existing as StoredOwnerAiSettings | null;
  if (!settings) return statusFromStored(null);
  const next = {
    ...settings,
    enabled: input.enabled,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy,
  };
  await settingsStore().setJSON(settingsKey(input.organizationId), next);
  return statusFromStored(next);
}

export async function getOwnerOpenAiRuntimeSettings(
  organizationId: string,
): Promise<{ apiKey: string | null; model: string; status: OwnerAiSettingsStatus }> {
  const settings = (await settingsStore().get(settingsKey(organizationId), {
    type: "json",
  })) as StoredOwnerAiSettings | null;
  const status = statusFromStored(settings);
  if (!settings?.enabled || !settings.encryptedApiKey) {
    return { apiKey: null, model: status.model, status };
  }
  return { apiKey: decryptSecret(settings), model: settings.model || defaultModel, status };
}
