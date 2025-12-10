import type { Middleware } from '../types';
import type { ComponentType, ReactElement } from 'react';

/**
 * Set layout for all routes using this middleware
 * 
 * The layout is stored in request context and automatically
 * picked up by the ui() helper via AsyncLocalStorage.
 * 
 * @example
 * ```ts
 * import { withLayout } from '../../lib/router/react/middleware';
 * import { AdminLayout } from './ui/AdminLayout';
 * 
 * // Apply to specific routes
 * router.get('/admin/dashboard', handler, [withLayout(AdminLayout)]);
 * 
 * // Or apply to entire route group
 * router.group('/admin', (group) => {
 *   group.get('/dashboard', handler);
 * }, [withLayout(AdminLayout)]);
 * ```
 */
export function withLayout(
  layout: ComponentType<{ children: ReactElement }>
): Middleware {
  return async (ctx, next) => {
    ctx.layout = layout;
    return next();
  };
}
