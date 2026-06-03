import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config, logger } from '@config';
import * as schema from './schema';

/**
 * PostgreSQL Connection Pool + Drizzle ORM
 *
 * Why Drizzle over Prisma?
 * - SQL-like API (no learning a custom query language)
 * - Zero runtime overhead (queries compile to pure SQL)
 * - Full TypeScript inference from schema
 * - Lighter bundle size (~35KB vs Prisma's ~2MB engine)
 * - Better for performance-critical applications
 *
 * Connection Pool Strategy:
 * - min: Keep 2 connections warm (avoids cold-start latency)
 * - max: 10 connections (tune based on: DB max_connections / number_of_server_instances)
 * - idleTimeoutMillis: Release idle connections after 30s
 * - connectionTimeoutMillis: Fail fast if DB is unreachable
 */
const pool = new Pool({
  connectionString: config.database.url,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Log pool events for observability
pool.on('error', (err) => {
  logger.error({ msg: 'Unexpected PostgreSQL pool error', error: err.message });
});

pool.on('connect', () => {
  logger.debug({ msg: 'New PostgreSQL connection established' });
});

/**
 * Drizzle ORM instance — the single entry point for all database operations.
 * Schema is passed in so Drizzle can provide full type inference on queries.
 */
export const db = drizzle(pool, {
  schema,
  logger: config.server.isDev,
});

export type Database = typeof db;

/**
 * Health check — verifies the database is reachable.
 * Used by the /health endpoint and readiness probes.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    logger.error({ msg: 'Database health check failed', error });
    return false;
  }
}

/**
 * Graceful shutdown — drain all connections.
 * Called during SIGTERM/SIGINT handling.
 */
export async function closeDatabasePool(): Promise<void> {
  logger.info({ msg: 'Closing database connection pool...' });
  await pool.end();
  logger.info({ msg: 'Database pool closed' });
}
