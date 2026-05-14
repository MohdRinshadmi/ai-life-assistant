import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

/**
 * API Client — Axios instance with interceptors
 *
 * Features:
 * - Automatic access token injection
 * - Automatic token refresh on 401
 * - Request/response logging in dev
 * - Request cancellation support
 * - Platform-aware base URL (Android emulator uses 10.0.2.2)
 *
 * Why Axios over fetch?
 * - Interceptors for auth token management
 * - Automatic JSON transforms
 * - Request cancellation
 * - Better error handling
 * - Timeout support
 */

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api/v1',  // Android emulator → host machine
  ios: 'http://localhost:3000/api/v1',
  default: 'http://localhost:3000/api/v1',
});

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000, // 30s timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request Interceptor — Attach access token ──────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — Handle 401 + token refresh ──
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Call refresh endpoint
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data.tokens;

        // Update store
        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

        // Retry original + queued requests
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed → logout
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
