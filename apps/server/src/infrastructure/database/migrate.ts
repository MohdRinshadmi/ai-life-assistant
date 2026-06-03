import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './client';
import { logger } from '@config';

/**
 * Run database migrations.
 * 
 * Usage: npm run db:migrate (from apps/server)
 * This runs as a standalone script, not part of the server startup.
 * 
 * Why separate from server startup?
 * - Migrations should be explicit, not automatic
 * - In production, migrations run in CI/CD pipeline before deployment
 * - Prevents accidental schema changes on server restart
 */
async function runMigrations() {
  logger.info({ msg: 'Running database migrations...' });

  try {
    await migrate(db, {
      migrationsFolder: './drizzle',
    });
    logger.info({ msg: '✅ Migrations completed successfully' });
    process.exit(0);
  } catch (error) {
    logger.error({ msg: '❌ Migration failed', error });
    process.exit(1);
  }
}

runMigrations();
