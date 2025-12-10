import type { Middleware, RequestContext } from '../router/types';
import { redirect } from '../router/response';
import { getSessionFromRequest } from '../session';

/**
 * Options for requireAuth middleware
 */
export interface AuthOptions {
  /**
   * Custom response when authentication fails
   * Default: redirect to /admin/login with return URL
   */
  onUnauthorized?: (ctx: RequestContext) => Response | Promise<Response>;
}

/**
 * Require authentication
 * 
 * @example
 * ```ts
 * // Default: redirect to login
 * requireAuth()
 * 
 * // Custom: return JSON error
 * requireAuth({
 *   onUnauthorized: () => json({ error: 'Unauthorized' }, { status: 401 })
 * })
 * 
 * // Custom: redirect to custom page
 * requireAuth({
 *   onUnauthorized: () => redirect('/access-denied')
 * })
 * ```
 */
export function requireAuth(options: AuthOptions = {}): Middleware {
  return async (ctx, next) => {
    const session = await getSessionFromRequest(ctx.request);
    
    if (!session) {
      // Use custom unauthorized handler or default redirect
      if (options.onUnauthorized) {
        return options.onUnauthorized(ctx);
      }
      
      // Default: redirect to login with return URL
      const returnTo = encodeURIComponent(ctx.url.pathname);
      return redirect(`/admin/login?return=${returnTo}`);
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
      return redirect(redirectTo);
    }
    
    return next();
  };
}
