// Web counterpart of the mobile secureStorage (keychain). localStorage keeps the
// session across reloads; tokens are also mirrored in the in-memory auth store.
const STORAGE_KEY = 'ai-life-assistant-auth';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  get(): StoredTokens | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredTokens) : null;
    } catch {
      return null;
    }
  },
  set(tokens: StoredTokens): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
