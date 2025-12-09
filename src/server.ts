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
  hostname: process.env.HOSTNAME || '127.0.0.1',
  development: process.env.NODE_ENV !== 'production',
});

console.log(`🚀 Server running at http://${server.hostname}:${server.port}`);
