import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@infrastructure/database';
import { users, refreshTokens } from '@infrastructure/database/schema';

/**
 * Auth Repository — Data access layer
 *
 * Pattern: Repository separates data access from business logic.
 * This makes the service layer testable (mock the repository)
 * and keeps SQL/Drizzle concerns out of business logic.
 */

export const authRepository = {
  // ── Users ──────────────────────────────────────────

  async findUserByEmail(email: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  },

  async findUserById(id: string) {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  },

  async createUser(data: {
    email: string;
    passwordHash: string;
    displayName: string;
  }) {
    const result = await db
      .insert(users)
      .values(data)
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    return result[0];
  },

  async updateLastLogin(userId: string) {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  },

  // ── Refresh Tokens ────────────────────────────────

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    family: string;
    deviceInfo?: string;
    expiresAt: Date;
  }) {
    const result = await db
      .insert(refreshTokens)
      .values(data)
      .returning();
    return result[0];
  },

  async findRefreshTokenByFamily(family: string) {
    const result = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.family, family),
          isNull(refreshTokens.revokedAt)
        )
      )
      .limit(1);
    return result[0] || null;
  },

  async revokeRefreshToken(tokenId: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenId));
  },

  async revokeAllUserTokens(userId: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt)
        )
      );
  },

  async revokeTokenFamily(family: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.family, family));
  },
};
