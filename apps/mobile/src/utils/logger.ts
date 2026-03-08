/**
 * Logging utility
 *
 * Provides namespaced console logging. Console output is dev-only;
 * the in-app realtime console receives entries in all builds.
 */

import { consoleLog } from '../store/consoleStore';

const isDev = __DEV__;

type LogData = unknown;

function formatMessage(namespace: string, message: string): string {
  const timestamp = new Date().toLocaleTimeString();
  return `[${timestamp}] [${namespace}] ${message}`;
}

export const logger = {
  /**
   * Log scanner workflow events
   */
  scan: (message: string, data?: LogData) => {
    consoleLog('info', 'scan', message, data);
    if (isDev) {
      if (data !== undefined) {
        console.log(formatMessage('Scanner', message), data);
      } else {
        console.log(formatMessage('Scanner', message));
      }
    }
  },

  /**
   * Log general info events
   */
  info: (message: string, data?: LogData) => {
    consoleLog('info', 'system', message, data);
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
    consoleLog('warn', 'system', message, data);
    if (isDev) {
      if (data !== undefined) {
        console.warn(formatMessage('Warn', message), data);
      } else {
        console.warn(formatMessage('Warn', message));
      }
    }
  },

  /**
   * Log error events (always logs to native console, even in production).
   * Data payload is only included in dev builds to avoid leaking PII.
   */
  error: (message: string, data?: LogData) => {
    consoleLog('error', 'system', message, data);
    if (isDev && data !== undefined) {
      console.error(formatMessage('Error', message), data);
    } else {
      console.error(formatMessage('Error', message));
    }
  },
};
