import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Conversations Table
 *
 * One row per chat thread. messageCount and lastMessageAt are denormalized
 * so the conversation list can be fetched without a COUNT(*) subquery per row.
 * They are kept in sync by the chat service after every message insert.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('New conversation'),
    messageCount: integer('message_count').notNull().default(0),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('conversations_user_id_idx').on(table.userId),
    index('conversations_last_message_at_idx').on(table.lastMessageAt),
  ]
);

/**
 * Messages Table
 *
 * Every turn in a conversation. role is 'user' | 'assistant'.
 * System prompts are NOT stored — they are injected at query time.
 * tokenCount is populated after the LLM responds for context budget tracking.
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('messages_conversation_id_idx').on(table.conversationId),
    index('messages_created_at_idx').on(table.createdAt),
  ]
);
