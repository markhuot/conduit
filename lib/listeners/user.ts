/**
 * User listener
 * 
 * Subscribes to user events and maintains user store.
 * 
 * EVENT READING STRATEGY:
 * This listener is notified synchronously by the EventStore when events
 * are emitted. This is the simplest approach for development.
 * 
 * In production, this listener could implement its own event reading mechanism:
 * - File watcher: Poll/watch data/events/ directory for new JSONL entries
 * - Redis consumer: Subscribe to Redis Stream as a consumer group
 * - Database polling: Query events table for new events periodically
 * 
 * The key is that each listener decides HOW it reads events based on
 * the event source it's configured to use.
 */

import type { EventListener } from '../events/types';
import type { UserRegisteredEvent } from '../events/types';
import { resolve } from '../../src/container';
import type { UserConfig } from '../users/types';

export class UserListener implements EventListener<UserRegisteredEvent> {
  subscribesTo = ['user.registered'] as const;

  /**
   * Handle UserRegistered event
   * Write user to persistent store
   */
  async handle(event: UserRegisteredEvent): Promise<void> {
    const { store } = resolve<UserConfig>('users');

    // Check if user already exists (idempotency)
    const existing = await store.findById(event.data.userId);
    if (existing) {
      // Already processed this event
      console.log(`User ${event.data.userId} already exists, skipping`);
      return;
    }

    // Create user in store
    await store.create({
      id: event.data.userId,
      email: event.data.email,
      passwordHash: event.data.passwordHash,
      createdAt: event.data.createdAt,
    });

    console.log(`✓ User registered: ${event.data.email}`);
  }
}
