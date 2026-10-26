import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Database client (CLAUDE.md → Database).
//
// Driver: drizzle-orm/neon-http. Each query is one HTTPS request, so a
// serverless function never holds a connection or a WebSocket pool. The
// submission upsert needs a transaction; neon-http has no interactive
// transactions, but `db.batch([...])` sends several statements in one request
// and Neon runs them as a single transaction (all or nothing). A batch can't
// pass one statement's result to the next, so statements that need the
// evaluation id look it up by its natural key (see db/evaluaciones.ts).
//
// Created lazily: importing this module (e.g. during `next build`) must not
// require DATABASE_URL.

export type BaseDatos = NeonHttpDatabase<typeof schema>;

let instancia: BaseDatos | null = null;

export function getDb(): BaseDatos {
  if (!instancia) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    instancia = drizzle({ client: neon(url), schema });
  }
  return instancia;
}

export { schema };
