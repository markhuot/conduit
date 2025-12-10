import { MemorySessionStore } from '../lib/session/stores/memory';
import { register } from '../src/container';

/**
 * Session storage configuration
 * 
 * Change this file to configure session backend.
 * Default: In-memory storage for local development.
 */

// Development: In-memory storage
register('session', () => ({
  store: new MemorySessionStore(),
}));

// Production examples (uncomment and configure as needed):

// Redis:
// import { RedisSessionStore } from '../lib/auth/stores/redis';
// import Redis from 'ioredis';
//
// if (process.env.NODE_ENV === 'production') {
//   register('session', () => ({
//     store: new RedisSessionStore(new Redis(process.env.REDIS_URL!)),
//   }));
// }

// Cloudflare Workers KV:
// import { KVSessionStore } from '../lib/auth/stores/kv';
//
// if (process.env.NODE_ENV === 'production') {
//   register('session', () => ({
//     store: new KVSessionStore(env.SESSION_STORE),
//   }));
// }

// Cloudflare D1:
// import { D1SessionStore } from '../lib/auth/stores/d1';
//
// if (process.env.NODE_ENV === 'production') {
//   register('session', () => ({
//     store: new D1SessionStore(env.DB),
//   }));
// }
