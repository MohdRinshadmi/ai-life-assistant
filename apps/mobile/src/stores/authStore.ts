import { create } from 'zustand';

/**
 * Auth Store — Zustand
 *
 * Why Zustand over Redux/Context?
 * - Zero boilerplate (no reducers, actions, providers)
 * - Works outside React components (interceptors, services)
 * - Tiny bundle size (~1KB)
 * - Built-in devtools support
 * - No provider wrapper needed
 *
 * Security note:
 * Tokens in memory only (Zustand store). On app launch, we load
 * from react-native-keychain (encrypted native storage) into this store.
 * Never persist tokens to AsyncStorage (not encrypted).
 */

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthState['user']) => void;
  setLoading: (loading: boolean) => void;
  login: (user: AuthState['user'], accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: true, // True until we check stored tokens
  accessToken: null,
  refreshToken: null,
  user: null,

  // Actions
  setTokens: (accessToken, refreshToken) =>
    set({ accessToken, refreshToken, isAuthenticated: true }),

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  login: (user, accessToken, refreshToken) =>
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    }),

  logout: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
