import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './module-registry';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let client: ReturnType<typeof postgres> | null = null;

export function getDatabase() {
  if (db) return db;

  const url = process.env.DATABASE_URL;
  if (!url) return null;

  try {
    client = postgres(url, { max: 10 });
    db = drizzle(client, { schema });
    return db;
  } catch {
    console.warn('[database] Failed to connect to PostgreSQL, falling back to in-memory store');
    return null;
  }
}

export async function closeDatabase() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}
