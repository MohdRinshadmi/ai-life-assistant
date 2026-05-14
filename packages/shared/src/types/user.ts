/**
 * User types shared between mobile and server.
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** What the server returns after login/register */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expires
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceInfo?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
