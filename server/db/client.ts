import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(url: string) {
  const client = postgres(url, { max: 5, prepare: false, idle_timeout: 20 });
  return drizzle(client, { schema });
}

let database: Database | undefined;

export function getDatabase(): Database {
  const url =
    typeof Netlify === "undefined"
      ? process.env.NETLIFY_DB_URL ?? process.env.DATABASE_URL
      : Netlify.env.get("NETLIFY_DB_URL") ?? Netlify.env.get("DATABASE_URL");
  if (!url) throw new Error("NETLIFY_DB_URL or DATABASE_URL is not configured");
  database ??= createDatabase(url);
  return database;
}
