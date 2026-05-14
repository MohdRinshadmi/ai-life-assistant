CREATE TABLE IF NOT EXISTS "knowledge_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "source" text NOT NULL DEFAULT 'note',
  "embedding" vector(1536),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "knowledge_items_user_id_idx"
  ON "knowledge_items" ("user_id");

CREATE INDEX IF NOT EXISTS "knowledge_items_created_at_idx"
  ON "knowledge_items" ("created_at");

-- HNSW index for fast approximate nearest-neighbour search.
-- ef_construction=128, m=16 are good defaults for datasets up to ~1M rows.
-- cosine_ops matches the <=> (cosine distance) operator used in queries.
CREATE INDEX IF NOT EXISTS "knowledge_items_embedding_hnsw_idx"
  ON "knowledge_items" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);
