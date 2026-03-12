import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a QueryClient configured for testing:
 * - No retries (fail fast)
 * - No GC delay (immediate cleanup)
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

/**
 * Create a React wrapper with QueryClientProvider for renderHook.
 * Returns both the wrapper and the queryClient for spy/assertion access.
 */
export function createWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { wrapper, queryClient: qc };
}
