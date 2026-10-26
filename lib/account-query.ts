import { QueryClient } from '@tanstack/react-query';

export function createAccountQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: { gcTime: Infinity },
    },
  });
}
