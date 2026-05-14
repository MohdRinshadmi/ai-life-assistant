/**
 * Shared constants between mobile and server.
 */

/** API versioning */
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

/** Pagination defaults */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Validation constraints */
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  DISPLAY_NAME_MIN_LENGTH: 2,
  DISPLAY_NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  CHAT_MESSAGE_MAX_LENGTH: 10_000,
  TASK_TITLE_MAX_LENGTH: 255,
  TASK_DESCRIPTION_MAX_LENGTH: 5_000,
} as const;

/** Chat constants */
export const CHAT = {
  MAX_CONTEXT_MESSAGES: 20,
  MAX_TOKENS_PER_REQUEST: 4096,
  STREAMING_CHUNK_DELIMITER: '\n\n',
} as const;
