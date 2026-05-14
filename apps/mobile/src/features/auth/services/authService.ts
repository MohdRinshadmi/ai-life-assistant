import { apiClient } from '../../../services/api/client';
import { secureStorage } from '../../../services/storage/secureStorage';
import { useAuthStore } from '../../../stores/authStore';
import { logger } from '../../../utils/logger';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@ai-life/shared';

/**
 * Auth Service — Mobile side
 *
 * Handles the full auth lifecycle:
 * 1. Login/Register → API call → store tokens securely → update Zustand
 * 2. App launch → check Keychain → restore session or redirect to login
 * 3. Logout → clear Keychain → clear Zustand → redirect to login
 */

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<{ data: AuthResponse }>('/auth/login', data);
    const { user, tokens } = response.data.data;

    // Store tokens securely (encrypted)
    await secureStorage.saveTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    // Update in-memory state
    useAuthStore.getState().login(user, tokens.accessToken, tokens.refreshToken);

    logger.info('Login successful', user.email);
    return { user, tokens };
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<{ data: AuthResponse }>('/auth/register', data);
    const { user, tokens } = response.data.data;

    await secureStorage.saveTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    useAuthStore.getState().login(user, tokens.accessToken, tokens.refreshToken);

    logger.info('Registration successful', user.email);
    return { user, tokens };
  },

  async logout(): Promise<void> {
    try {
      // Tell the server to revoke tokens
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Logout locally even if server call fails
      logger.warn('Server logout failed, clearing local session', error);
    }

    await secureStorage.clearTokens();
    useAuthStore.getState().logout();
    logger.info('Logged out');
  },

  /**
   * Check for stored tokens on app launch.
   * If valid tokens exist, restore the session.
   * If not, redirect to login.
   */
  async initialize(): Promise<void> {
    try {
      const tokens = await secureStorage.getTokens();

      if (!tokens) {
        useAuthStore.getState().setLoading(false);
        return;
      }

      // Set tokens in store so the API client can use them
      useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);

      // Verify tokens are still valid by fetching user profile
      const response = await apiClient.get<{ data: { user: any } }>('/auth/me');
      const { user } = response.data.data;

      useAuthStore.getState().login(user, tokens.accessToken, tokens.refreshToken);
      logger.info('Session restored', user.email);
    } catch (error) {
      // Tokens expired or invalid — clear and redirect to login
      logger.warn('Session restoration failed, clearing tokens');
      await secureStorage.clearTokens();
      useAuthStore.getState().logout();
    }
  },
};
