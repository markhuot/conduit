/**
 * Event store configuration
 * 
 * This file:
 * 1. Creates and registers the event store
 * 2. Registers ALL event listeners (centralizes subscriptions)
 * 
 * This avoids circular dependencies between store configs.
 * Store configs (users.ts, content.ts, etc.) only register their stores.
 * 
 * Change this file to configure event writer backend.
 * Default: File-based storage for local development.
 */

import { FileEventWriter } from '../lib/events/writers/file';
import { EventStore } from '../lib/events/store';
import { UserListener } from '../lib/listeners/user';
import { register } from '../src/container';

// Create event writer (constructor creates directories)
const eventWriter = new FileEventWriter();

// Production examples (uncomment and configure as needed):
// import { RedisEventWriter } from '../lib/events/writers/redis';
// import Redis from 'ioredis';
//
// const eventWriter = process.env.NODE_ENV === 'production'
//   ? new RedisEventWriter(new Redis(process.env.REDIS_URL!))
//   : new FileEventWriter();

// Create event store
const eventStore = new EventStore(eventWriter);

// Register ALL event listeners here (centralized)
eventStore.subscribe(new UserListener());

// Future listeners:
// eventStore.subscribe(new ContentListener());
// eventStore.subscribe(new AssetListener());
// eventStore.subscribe(new SearchListener());

// Register in container
register('eventStore', () => eventStore);

// Export for handler access
export function getEventStore() {
  return eventStore;
}

console.log(`📝 Event store registered: ${eventWriter.constructor.name}`);
console.log(`🎧 Listeners registered: UserListener`);
