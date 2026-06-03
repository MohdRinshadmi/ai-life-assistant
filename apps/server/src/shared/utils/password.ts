import bcrypt from 'bcrypt';
import { config } from '@config';

/**
 * Password Hashing Utilities
 *
 * Uses bcrypt with configurable salt rounds (default: 12).
 *
 * Why bcrypt over argon2?
 * - Broader ecosystem support
 * - Well-understood security properties
 * - 12 rounds ≈ 250ms on modern hardware (good balance of security vs UX)
 *
 * Tradeoff: argon2 is technically stronger (memory-hard),
 * but bcrypt is battle-tested and sufficient for most apps.
 */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.jwt.bcryptSaltRounds);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
