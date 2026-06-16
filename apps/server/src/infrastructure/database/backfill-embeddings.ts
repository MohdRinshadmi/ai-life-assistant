import { eq, sql } from 'drizzle-orm';
import { db, closeDatabasePool } from './client';
import { knowledgeItems } from '@infrastructure/database/schema';
import { embedBatch, isGeminiConfigured } from '@shared/services/gemini.service';
import { logger } from '@config';

/**
 * Re-embed knowledge items with the current embedding provider.
 *
 * Usage:
 *   npm run db:reembed                 # re-embed ALL items (default)
 *   npm run db:reembed -- --only-missing   # only items with a NULL embedding
 *
 * Why this exists:
 * The embedding provider was migrated (OpenAI text-embedding-3-small → Gemini
 * gemini-embedding-001). Both output 1536-dim vectors, so pgvector's <=> won't
 * error — but cosine similarity between vectors from two *different* model
 * spaces is meaningless, so RAG silently retrieves nothing useful. Existing
 * rows must be re-embedded with the new provider. The vector itself carries no
 * record of which provider produced it, so the default is to re-embed every
 * row; --only-missing is for the routine "fill in rows that never embedded" case.
 *
 * Standalone script (like migrate.ts) — not part of server startup.
 */

// Rows per DB round-trip. embedBatch() chunks the API side at its own limit;
// this bounds memory and gives per-batch progress + failure isolation.
const BATCH_SIZE = 50;

async function backfill() {
  if (!isGeminiConfigured()) {
    logger.error({ msg: '❌ GEMINI_API_KEY not configured — cannot backfill embeddings' });
    process.exit(1);
  }

  const onlyMissing = process.argv.includes('--only-missing');

  const rows = await db
    .select({
      id: knowledgeItems.id,
      title: knowledgeItems.title,
      content: knowledgeItems.content,
    })
    .from(knowledgeItems)
    .where(onlyMissing ? sql`${knowledgeItems.embedding} IS NULL` : undefined);

  logger.info({
    msg: 'Starting embedding backfill',
    mode: onlyMissing ? 'only-missing' : 'all',
    total: rows.length,
  });

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const texts = chunk.map((r) => `${r.title}\n\n${r.content}`);

    try {
      const embeddings = await embedBatch(texts, 'RETRIEVAL_DOCUMENT');

      // Plain .set({ embedding }) deliberately does NOT touch updated_at — a
      // backfill is not a content edit and shouldn't reorder items by recency.
      await Promise.all(
        chunk.map((r, j) =>
          db
            .update(knowledgeItems)
            .set({ embedding: embeddings[j] })
            .where(eq(knowledgeItems.id, r.id))
        )
      );

      updated += chunk.length;
      logger.info({ msg: 'Backfill progress', updated, total: rows.length });
    } catch (err) {
      failed += chunk.length;
      logger.error({ msg: 'Batch embedding failed — skipping batch', batchStart: i, err });
    }
  }

  logger.info({ msg: '✅ Backfill complete', updated, failed, total: rows.length });
  await closeDatabasePool();
  process.exit(failed > 0 ? 1 : 0);
}

backfill().catch(async (err) => {
  logger.error({ msg: '❌ Backfill crashed', err });
  await closeDatabasePool();
  process.exit(1);
});
