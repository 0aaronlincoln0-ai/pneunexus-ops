import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://pneunexus:pneunexus@localhost:5432/pneunexus",
  },
  strict: true,
  verbose: true,
});
