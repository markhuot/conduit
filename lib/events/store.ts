/**
 * Event store
 * 
 * Responsibilities:
 * - Manage event listeners (subscribe/notify)
 * - Assign event IDs and timestamps
 * - Delegate persistence to EventWriter implementation
 * 
 * The EventWriter is write-only. Listeners implement their own
 * reading mechanisms (file watchers, S3 events, Redis streams, etc.)
 * 
 * The EventWriter backend is injected via constructor (from config)
 */

import type { BaseEvent, EventListener, EventWriter } from './types';

export class EventStore {
  private listeners: EventListener[] = [];
  private writer: EventWriter;

  constructor(writer: EventWriter) {
    this.writer = writer;
  }

  /**
   * Register an event listener
   * 
   * NOTE: The EventStore notifies listeners synchronously after writing.
   * Listeners may also implement their own async reading mechanisms
   * (polling, watching, streaming, etc.)
   */
  subscribe(listener: EventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Emit an event
   * 
   * 1. Assigns ID and timestamp if not present
   * 2. Persists to event writer (source of truth)
   * 3. Notifies listeners synchronously (non-blocking)
   * 
   * @throws Error if event persistence fails
   */
  async emit(event: BaseEvent): Promise<void> {
    // Ensure event has ID and timestamp
    const completeEvent: BaseEvent = {
      ...event,
      id: event.id || this.generateEventId(),
      timestamp: event.timestamp || Date.now(),
    };

    // Persist to event writer (source of truth)
    await this.writer.write(completeEvent);

    // Notify listeners synchronously (async, failures don't block)
    // Use Promise.allSettled so one listener failure doesn't affect others
    const promises = this.listeners
      .filter(listener => listener.subscribesTo.includes(event.type))
      .map(listener => listener.handle(completeEvent).catch(error => {
        // Log listener errors but don't fail the event emission
        console.error(`Listener error for ${event.type}:`, error);
      }));

    await Promise.allSettled(promises);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  }
}
