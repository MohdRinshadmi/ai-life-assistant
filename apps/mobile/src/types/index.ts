/**
 * Mobile-only shared TypeScript types.
 *
 * Domain types shared with the backend (User, Task, Message, …) live in the
 * `@ai-life/shared` package — only put types here that are specific to the
 * mobile client and don't belong to a single feature.
 */

/** Auth tokens persisted in the device keychain as a single JSON blob. */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/** Generic async lifecycle status for data-fetching hooks and screens. */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/** Value that may be explicitly absent. */
export type Nullable<T> = T | null;
