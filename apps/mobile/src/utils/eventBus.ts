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

/**
 * Typed event map — add new events here with their payload types.
 * Use `void` for events that carry no data.
 */
type EventMap = {
  'user:logout': void;
  'queue:changed': void;
};

type EventName = keyof EventMap;

/** Callback type that adapts to the event's payload (void -> no args, otherwise one arg). */
type EventCallback<E extends EventName> = EventMap[E] extends void
  ? () => void
  : (payload: EventMap[E]) => void;

// Internal untyped callback for storage
type AnyCallback = (...args: unknown[]) => void;

class EventBus {
  private listeners: Map<EventName, Set<AnyCallback>> = new Map();

  on<E extends EventName>(event: E, callback: EventCallback<E>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as AnyCallback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as AnyCallback);
    };
  }

  emit<E extends EventName>(
    ...args: EventMap[E] extends void ? [event: E] : [event: E, payload: EventMap[E]]
  ): void {
    const [event, payload] = args;
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          if (payload !== undefined) {
            (callback as (payload: EventMap[E]) => void)(payload);
          } else {
            (callback as () => void)();
          }
        } catch (error: unknown) {
          logger.error(`Error in event handler for '${event}'`, error);
        }
      });
    }
  }

  off<E extends EventName>(event: E, callback: EventCallback<E>): void {
    this.listeners.get(event)?.delete(callback as AnyCallback);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();

// Event type constants for type safety
export const AppEvents = {
  USER_LOGOUT: 'user:logout',
} as const satisfies Record<string, EventName>;
