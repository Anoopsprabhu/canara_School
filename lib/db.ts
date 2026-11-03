import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Reuse one client across dev hot-reloads so Neon isn't flooded with connections.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };
const client = globalForDb.pgClient ?? postgres(process.env.DATABASE_URL!, { max: 5, prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });

// Drizzle wraps the underlying postgres error in a DrizzleQueryError whose own
// .message is "Failed query: ...", with the real Postgres error under .cause.
export function isUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (/duplicate key/i.test(e.message)) return true;
  const cause = (e as { cause?: unknown }).cause;
  return cause instanceof Error && /duplicate key/i.test(cause.message);
}
