import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { consoleLog } from '../store/consoleStore';

/**
 * Listens for online/offline transitions and logs state changes
 * to the realtime console. Only logs when the state actually changes.
 */
export function useConsoleNetworkLogger() {
  const prevConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected;

      if (prevConnected.current !== null && connected !== prevConnected.current) {
        if (connected) {
          consoleLog('info', 'network', `Online (${state.type})`);
        } else {
          consoleLog('warn', 'network', 'Offline');
        }
      }

      prevConnected.current = connected;
    });

    return unsubscribe;
  }, []);
}
