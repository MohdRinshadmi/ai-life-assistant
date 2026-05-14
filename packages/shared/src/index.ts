/**
 * @ai-life/shared — Shared types, validators, and constants
 *
 * This package is consumed by both the mobile app and the server.
 * Only put things here that BOTH sides need.
 *
 * Rules:
 * - No Node.js-specific imports (must work in React Native)
 * - No React Native-specific imports (must work in Node.js)
 * - Only pure TypeScript types, Zod schemas, and constants
 */

export * from './types/api';
export * from './types/user';
export * from './types/chat';
export * from './types/knowledge';
export * from './types/task';
export * from './constants';
