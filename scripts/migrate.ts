import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url =
  process.env.NETLIFY_DB_URL ??
  process.env.DATABASE_URL ??
  "postgres://pneunexus:pneunexus@localhost:5432/pneunexus";
const client = postgres(url, { max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("Database migrations completed.");
} finally {
  await client.end();
}
