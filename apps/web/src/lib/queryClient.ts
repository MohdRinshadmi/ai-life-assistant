import { QueryClient } from '@tanstack/react-query';

/**
 * Module-level singleton so non-React code (socket event handlers,
 * auth logout) can read/write the cache without hook access.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
