import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * pgvector column type for Drizzle ORM.
 *
 * drizzle-orm doesn't ship a native vector type yet, so we use customType.
 * Data flows as number[] in TypeScript and as the pgvector string format
 * "[0.1,0.2,...]" at the DB driver boundary.
 *
 * dimensions=1536 matches OpenAI text-embedding-3-small.
 */
const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType: () => `vector(${dimensions})`,
    toDriver: (val: number[]) => `[${val.join(',')}]`,
    fromDriver: (val: string) => val.slice(1, -1).split(',').map(Number),
  })(name);

/**
 * Knowledge Items Table
 *
 * Stores user notes/documents alongside their vector embeddings.
 * The embedding column enables pgvector similarity search at query time.
 *
 * Design decisions:
 * - source enum kept as text (not pg enum) for easy extension
 * - Embedding NOT NULL after creation — ensured at the service layer
 * - No full-text GIN index — pgvector covers semantic search;
 *   full-text (keyword) search can be added as a secondary path later
 */
export const knowledgeItems = pgTable(
  'knowledge_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    source: text('source').notNull().default('note'), // 'note' | 'task' | 'import'
    embedding: vector('embedding', 1536),             // nullable until embedded
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('knowledge_items_user_id_idx').on(table.userId),
    index('knowledge_items_created_at_idx').on(table.createdAt),
    // HNSW index for fast approximate nearest-neighbour search.
    // Created in the SQL migration (not here) because Drizzle can't
    // express USING hnsw with operator class syntax.
  ]
);
