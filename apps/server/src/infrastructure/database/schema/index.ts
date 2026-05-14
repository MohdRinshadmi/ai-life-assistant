/**
 * Schema barrel export — all tables exported from here.
 * Drizzle uses this to build the full schema for type inference.
 *
 * As you add new modules (chat, tasks, etc.), add their schemas here.
 */
export { users, refreshTokens } from './users';
export { conversations, messages } from './chat';
export { knowledgeItems } from './knowledge';
export { tasks } from './tasks';
