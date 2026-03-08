import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { consoleLog } from '../store/consoleStore';

/**
 * Subscribes to React Query cache events and logs them to the realtime console.
 * Logs query success/error and mutation start/success/error.
 */
export function useConsoleQueryLogger() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const queryUnsub = queryClient.getQueryCache().subscribe((event) => {
      if (!event?.query) return;
      const key = JSON.stringify(event.query.queryKey);

      if (event.type === 'updated') {
        if (event.action.type === 'success') {
          consoleLog('info', 'query', `OK ${key}`);
        } else if (event.action.type === 'error') {
          const err = event.action.error;
          const msg = err instanceof Error ? err.message : String(err);
          consoleLog('error', 'query', `FAIL ${key}: ${msg}`);
        }
      }
    });

    const mutationUnsub = queryClient.getMutationCache().subscribe((event) => {
      if (!event?.mutation) return;
      const key = event.mutation.options.mutationKey
        ? JSON.stringify(event.mutation.options.mutationKey)
        : 'anonymous';

      if (event.type === 'updated') {
        if (event.action.type === 'pending') {
          consoleLog('debug', 'mutation', `START ${key}`);
        } else if (event.action.type === 'success') {
          consoleLog('info', 'mutation', `OK ${key}`);
        } else if (event.action.type === 'error') {
          const err = event.action.error;
          const msg = err instanceof Error ? err.message : String(err);
          consoleLog('error', 'mutation', `FAIL ${key}: ${msg}`);
        }
      }
    });

    return () => {
      queryUnsub();
      mutationUnsub();
    };
  }, [queryClient]);
}
