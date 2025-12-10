import { AsyncLocalStorage } from 'async_hooks';
import type { RequestContext } from './types';

/**
 * Async local storage for request context
 * Maintains request-scoped context across async operations
 * Each request gets its own isolated context, even with concurrent requests
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get current request context from async local storage
 * Available anywhere within the request handling chain
 * 
 * @throws Error if called outside a request handler
 * 
 * @example
 * ```ts
 * // In a handler or any function called during request
 * const ctx = getRequestContext();
 * const userId = ctx.session?.userId;
 * const layout = ctx.layout;
 * ```
 */
export function getRequestContext(): RequestContext {
  const ctx = requestContextStorage.getStore();
  if (!ctx) {
    throw new Error(
      'Request context not available. Are you calling this outside a request handler?'
    );
  }
  return ctx;
}

/**
 * Run callback with request context stored in async local storage
 * Used internally by the router
 * All async operations within the callback will have access to this context
 * 
 * @internal
 */
export async function runWithContext<T>(ctx: RequestContext, fn: () => T | Promise<T>): Promise<T> {
  return await requestContextStorage.run(ctx, fn);
}
