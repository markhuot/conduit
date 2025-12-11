/**
 * User store configuration
 * 
 * This file ONLY registers the user store.
 * Event listeners are registered in config/events.ts to avoid circular deps.
 * 
 * Change this file to configure user storage backend.
 * Default: File-based storage for local development.
 */

import { FileUserStore } from '../lib/users/stores/file';
import { register } from '../src/container';

// Register user store in container
// Constructor creates directories on instantiation
register('users', () => ({
  store: new FileUserStore(),
}));

// Production example (uncomment and configure as needed):
// import { D1UserStore } from '../lib/users/stores/d1';
//
// register('users', () => ({
//   store: process.env.NODE_ENV === 'production'
//     ? new D1UserStore(env.DB)
//     : new FileUserStore(),
// }));

console.log(`👥 User store registered`);
