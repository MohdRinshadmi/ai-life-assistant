import { eq, desc, and } from 'drizzle-orm';
import { db } from '@infrastructure/database';
import { conversations, messages } from '@infrastructure/database/schema';

export const chatRepository = {
  // ── Conversations ─────────────────────────────────

  async createConversation(data: { userId: string; title: string }) {
    const [row] = await db
      .insert(conversations)
      .values({ userId: data.userId, title: data.title })
      .returning();
    return row;
  },

  async findConversationById(id: string, userId: string) {
    const [row] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async listConversations(userId: string, limit = 20, offset = 0) {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);
  },

  async updateConversationStats(id: string) {
    await db
      .update(conversations)
      .set({
        messageCount: db.$count(messages, eq(messages.conversationId, id)),
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id));
  },

  async deleteConversation(id: string, userId: string) {
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  },

  // ── Messages ──────────────────────────────────────

  async createMessage(data: {
    conversationId: string;
    role: string;
    content: string;
    tokenCount?: number;
  }) {
    const [row] = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        tokenCount: data.tokenCount ?? null,
      })
      .returning();
    return row;
  },

  async updateMessageTokenCount(id: string, tokenCount: number) {
    await db
      .update(messages)
      .set({ tokenCount })
      .where(eq(messages.id, id));
  },

  async listMessages(conversationId: string, limit = 50, offset = 0) {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async getRecentMessages(conversationId: string, limit = 20) {
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    return rows.reverse(); // oldest first for LLM context
  },
};
