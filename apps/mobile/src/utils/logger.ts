/**
 * Dev-only logging utility
 *
 * Provides namespaced console logging that only runs in development builds.
 * Use this instead of inline console.log for cleaner production builds.
 */

const isDev = __DEV__;

type LogData = unknown;

function formatMessage(namespace: string, message: string, _data?: LogData): string {
  const timestamp = new Date().toLocaleTimeString();
  return `[${timestamp}] [${namespace}] ${message}`;
}

export const logger = {
  /**
   * Log scanner workflow events
   */
  scan: (message: string, data?: LogData) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(formatMessage('Scanner', message), data);
      } else {
        console.log(formatMessage('Scanner', message));
      }
    }
  },

  /**
   * Log asset count mode events
   */
  assetCount: (message: string, data?: LogData) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(formatMessage('AssetCount', message), data);
      } else {
        console.log(formatMessage('AssetCount', message));
      }
    }
  },

  /**
   * Log general info events
   */
  info: (message: string, data?: LogData) => {
    if (isDev) {
      if (data !== undefined) {
        console.log(formatMessage('Info', message), data);
      } else {
        console.log(formatMessage('Info', message));
      }
    }
  },

  /**
   * Log warning events
   */
  warn: (message: string, data?: LogData) => {
    if (isDev) {
      if (data !== undefined) {
        console.warn(formatMessage('Warn', message), data);
      } else {
        console.warn(formatMessage('Warn', message));
      }
    }
  },

  /**
   * Log error events (always logs, even in production for debugging)
   */
  error: (message: string, data?: LogData) => {
    if (data !== undefined) {
      console.error(formatMessage('Error', message), data);
    } else {
      console.error(formatMessage('Error', message));
    }
  },
};
