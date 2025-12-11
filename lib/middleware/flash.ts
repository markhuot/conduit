/**
 * Flash message middleware
 * Automatically loads flash messages from session into request context
 * This avoids prop drilling - views can access flash via context
 */

import type { Middleware } from '../router/types';
import { getFlash, getSessionIdFromRequest } from '../session';

/**
 * Middleware that loads flash messages into context
 * Place this early in middleware chain so all handlers have access
 */
export function flashMiddleware(): Middleware {
  return async (ctx, next) => {
    // Get session ID from cookie
    const sessionId = getSessionIdFromRequest(ctx.request);
    
    // Load flash messages into context
    if (sessionId) {
      ctx.flash = await getFlash(sessionId);
    }
    
    return next();
  };
}
