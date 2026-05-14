import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Tasks Table
 *
 * Design decisions:
 * - status/priority stored as text (not pg enum) — easier to extend without migrations
 * - dueDate nullable — some tasks are open-ended
 * - No foreign key to conversations — tasks are first-class, not chat by-products
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'),   // 'pending'|'in_progress'|'completed'|'cancelled'
    priority: text('priority').notNull().default('medium'), // 'low'|'medium'|'high'
    dueDate: timestamp('due_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('tasks_user_id_idx').on(table.userId),
    index('tasks_status_idx').on(table.status),
    index('tasks_due_date_idx').on(table.dueDate),
  ]
);
