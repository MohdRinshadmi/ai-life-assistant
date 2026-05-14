import { pgTable, uuid, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Users Table Schema
 *
 * Design decisions:
 * - UUID primary keys: No sequential ID guessing, safe for distributed systems
 * - Separate displayName from email: Support social logins and name changes
 * - avatarUrl: S3 presigned URL or external OAuth avatar
 * - isActive: Soft-disable accounts without deleting data (GDPR)
 * - Timestamps: Always track creation and modification
 *
 * Indexes:
 * - email: Unique + indexed (login lookups)
 * - isActive: Partial index for filtering (queries rarely include inactive)
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    avatarUrl: text('avatar_url'),
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_is_active_idx').on(table.isActive),
  ]
);

/**
 * Refresh Tokens Table
 *
 * Why store refresh tokens in DB?
 * - Enables token revocation (logout from all devices)
 * - Family-based rotation detection (security against token theft)
 * - Per-device session management
 *
 * The tokenHash stores bcrypt hash of the token — never store raw tokens.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    family: uuid('family').notNull(), // Token family for rotation detection
    deviceInfo: text('device_info'), // "iPhone 15, iOS 18" — for session management UI
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('refresh_tokens_user_id_idx').on(table.userId),
    index('refresh_tokens_family_idx').on(table.family),
  ]
);
