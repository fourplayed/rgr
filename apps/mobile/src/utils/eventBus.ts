/**
 * Simple event bus for decoupling stores and components
 *
 * Usage:
 *   // Subscribe to an event
 *   const unsubscribe = eventBus.on('user:logout', () => { ... });
 *
 *   // Emit an event
 *   eventBus.emit('user:logout');
 *
 *   // Cleanup
 *   unsubscribe();
 */

import { logger } from './logger';

type EventCallback = () => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          logger.error(`Error in event handler for '${event}'`, error);
        }
      });
    }
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();

// Event type constants for type safety
export const AppEvents = {
  USER_LOGOUT: 'user:logout',
} as const;
