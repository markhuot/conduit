import type { Router } from '../router';
import { errorToResponse } from '../router/errors';

/**
 * Bun HTTP server adapter
 * 
 * Wraps the router for use with Bun.serve()
 */
export interface BunAdapterOptions {
  port?: number;
  hostname?: string;
  development?: boolean;
}

/**
 * Create a Bun server from a router
 */
export function createBunServer(router: Router, options: BunAdapterOptions = {}) {
  const {
    port = 3000,
    hostname = '127.0.0.1',
    development = true,
  } = options;

  return Bun.serve({
    port,
    hostname,
    development,
    
    async fetch(request: Request): Promise<Response> {
      return await router.handle(request);
    },

    error(error: Error): Response {
      console.error('Server error:', error);
      return errorToResponse(error, development);
    },
  });
}
