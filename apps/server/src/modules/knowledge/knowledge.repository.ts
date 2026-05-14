import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database';
import { knowledgeItems } from '../../infrastructure/database/schema';
import { KnowledgeSearchResult } from '@ai-life/shared';

export const knowledgeRepository = {
  async create(data: {
    userId: string;
    title: string;
    content: string;
    source: string;
    embedding: number[] | null;
  }) {
    const [row] = await db
      .insert(knowledgeItems)
      .values({
        userId: data.userId,
        title: data.title,
        content: data.content,
        source: data.source,
        embedding: data.embedding ?? undefined,
      })
      .returning();
    return row;
  },

  async findById(id: string, userId: string) {
    const [row] = await db
      .select()
      .from(knowledgeItems)
      .where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async list(userId: string, limit = 50, offset = 0) {
    return db
      .select({
        id: knowledgeItems.id,
        userId: knowledgeItems.userId,
        title: knowledgeItems.title,
        content: knowledgeItems.content,
        source: knowledgeItems.source,
        createdAt: knowledgeItems.createdAt,
        updatedAt: knowledgeItems.updatedAt,
      })
      .from(knowledgeItems)
      .where(eq(knowledgeItems.userId, userId))
      .orderBy(desc(knowledgeItems.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async update(id: string, userId: string, data: {
    title?: string;
    content?: string;
    embedding?: number[] | null;
  }) {
    const [row] = await db
      .update(knowledgeItems)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.embedding !== undefined && { embedding: data.embedding ?? undefined }),
        updatedAt: new Date(),
      })
      .where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.userId, userId)))
      .returning();
    return row ?? null;
  },

  async delete(id: string, userId: string) {
    await db
      .delete(knowledgeItems)
      .where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.userId, userId)));
  },

  /**
   * Vector similarity search using pgvector's cosine distance operator (<=>).
   *
   * Why raw SQL here instead of Drizzle's ORM layer?
   * Drizzle doesn't support custom pg operators like <=> natively yet.
   * The HNSW index (created in 0002_knowledge_items.sql) makes this O(log n).
   *
   * similarity = 1 - cosine_distance (ranges 0→1, 1 = identical)
   * threshold = 0.70 means "at least 70% semantically similar"
   */
  async similaritySearch(
    userId: string,
    queryEmbedding: number[],
    topK = 3,
    threshold = 0.70
  ): Promise<KnowledgeSearchResult[]> {
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const rows = await db.execute<{
      id: string;
      user_id: string;
      title: string;
      content: string;
      source: string;
      created_at: Date;
      updated_at: Date;
      similarity: number;
    }>(sql`
      SELECT
        id,
        user_id,
        title,
        content,
        source,
        created_at,
        updated_at,
        1 - (embedding <=> ${vectorStr}::vector) AS similarity
      FROM knowledge_items
      WHERE user_id = ${userId}::uuid
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${vectorStr}::vector) > ${threshold}
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${topK}
    `);

    return rows.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      content: r.content,
      source: r.source as 'note' | 'task' | 'import',
      similarity: Number(r.similarity),
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }));
  },
};
