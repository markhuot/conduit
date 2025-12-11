import type { Middleware, RequestContext } from '../router/types';
import { RedirectError, UnauthorizedError } from '../router/errors';
import { getSessionFromRequest } from '../session';

/**
 * Options for requireAuth middleware
 */
export interface AuthOptions {
  /**
   * Custom error to throw when authentication fails
   * Default: redirect to /admin/login with return URL
   * 
   * @example
   * ```ts
   * // Custom JSON error
   * onUnauthorized: () => { throw new UnauthorizedError('Please log in') }
   * 
   * // Custom redirect
   * onUnauthorized: () => { throw new RedirectError('/access-denied') }
   * ```
   */
  onUnauthorized?: (ctx: RequestContext) => never;
}

/**
 * Require authentication
 * 
 * @example
 * ```ts
 * // Default: redirect to login
 * requireAuth()
 * 
 * // Custom: throw UnauthorizedError
 * requireAuth({
 *   onUnauthorized: () => { throw new UnauthorizedError('Please log in') }
 * })
 * 
 * // Custom: redirect to custom page
 * requireAuth({
 *   onUnauthorized: () => { throw new RedirectError('/access-denied') }
 * })
 * ```
 */
export function requireAuth(options: AuthOptions = {}): Middleware {
  return async (ctx, next) => {
    const session = await getSessionFromRequest(ctx.request);
    
    if (!session) {
      // Use custom unauthorized handler or default redirect
      if (options.onUnauthorized) {
        options.onUnauthorized(ctx);
      }
      
      // Default: redirect to login with return URL
      const returnTo = encodeURIComponent(ctx.url.pathname);
      throw new RedirectError(`/admin/login?return=${returnTo}`);
    }
    
    // Add session to context for handlers
    ctx.session = session;
    
    return next();
  };
}

/**
 * Redirect if already authenticated
 * Used on login page to prevent logged-in users from seeing it
 */
export function redirectIfAuth(redirectTo: string = '/admin/dashboard'): Middleware {
  return async (ctx, next) => {
    const session = await getSessionFromRequest(ctx.request);
    
    if (session) {
      throw new RedirectError(redirectTo);
    }
    
    return next();
  };
}
