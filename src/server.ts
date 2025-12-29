/**
 * Import config files to register and bootstrap services
 * 
 * ORDER DOESN'T MATTER (except events must be imported):
 * - config/session - Session store (independent)
 * - config/users - User store (independent)
 * - config/events - Event store + ALL listeners (independent)
 * 
 * Each store config file just registers its store in the container.
 * Event listeners are ALL registered in config/events.ts to avoid
 * circular dependencies.
 * 
 * This keeps server.ts clean and establishes a convention
 * for future stores (content, assets, etc.)
 */
import '../config/session';
import '../config/users';
import '../config/events';

import { Router } from '../lib/router';
import { createBunServer } from '../lib/adapters/bun';
import { registerRoutes } from './routes';

/**
 * Create and configure the router
 */
const router = new Router();
registerRoutes(router);

/**
 * Start the Bun HTTP server
 */
const server = createBunServer(router, {
  port: Number(process.env.PORT) || 3000,
  // LISTEN_HOST: Network interface to bind to (0.0.0.0 = all interfaces, 127.0.0.1 = localhost only)
  // This is NOT the public hostname - that comes from the request's Host header
  hostname: process.env.LISTEN_HOST || process.env.HOSTNAME || '127.0.0.1',
  development: process.env.NODE_ENV !== 'production',
});

console.log(`🚀 Server running at http://${server.hostname}:${server.port}`);
