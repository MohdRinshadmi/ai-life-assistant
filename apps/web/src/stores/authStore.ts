import { create } from 'zustand';
import type { User, AuthTokens } from '@ai-life/shared';
import { tokenStorage } from '@/services/storage/tokenStorage';

export type AuthUser = Pick<User, 'id' | 'email' | 'displayName' | 'avatarUrl'>;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setTokens: (tokens: Pick<AuthTokens, 'accessToken' | 'refreshToken'>) => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: AuthUser, tokens: Pick<AuthTokens, 'accessToken' | 'refreshToken'>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  refreshToken: null,
  user: null,

  setTokens: (tokens) => {
    tokenStorage.set(tokens);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  login: (user, tokens) => {
    tokenStorage.set(tokens);
    set({
      isAuthenticated: true,
      isLoading: false,
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },

  logout: () => {
    tokenStorage.clear();
    set({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },
}));
