import axios from 'axios';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@ai-life/shared';
import { apiClient } from './client';
import { env } from '@/config/env';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { useAuthStore } from '@/stores/authStore';

export const authService = {
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post('/auth/login', payload);
    return data.data as AuthResponse;
  },

  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post('/auth/register', payload);
    return data.data as AuthResponse;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      useAuthStore.getState().logout();
    }
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    return (data.data.user ?? data.data) as User;
  },

  /** Restore the session from localStorage on app boot. */
  async bootstrap(): Promise<void> {
    const store = useAuthStore.getState();
    const stored = tokenStorage.get();
    if (!stored) {
      store.setLoading(false);
      return;
    }
    try {
      // Refresh first so we start with a fresh access token.
      const { data } = await axios.post(`${env.apiBaseUrl}/auth/refresh`, {
        refreshToken: stored.refreshToken,
      });
      const tokens = data.data.tokens as { accessToken: string; refreshToken: string };
      store.setTokens(tokens);
      const user = await authService.me();
      store.login(
        { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
        tokens,
      );
    } catch {
      store.logout();
    }
  },
};
