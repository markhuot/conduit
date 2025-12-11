import type { RouteGroup } from '../router';
import { requireAuth, redirectIfAuth } from '../auth/middleware';
import { withLayout } from '../router/react/middleware';
import { flashMiddleware } from '../middleware/flash';
import { AdminLayout } from './ui/AdminLayout';

/**
 * Register admin routes
 * 
 * This function defines all CMS admin routes.
 * Handlers live in lib/admin/handlers/ making the admin panel a drop-in feature.
 * 
 * The admin layout is set via middleware and automatically picked up by ui()
 * through AsyncLocalStorage - no need to pass it to handlers.
 */
export function adminRoutes(group: RouteGroup): void {
  // Apply flash middleware to load messages into context
  group.use(flashMiddleware());
  
  // Apply admin layout to all routes in this group
  group.use(withLayout(AdminLayout));
  
  // Public routes (login and registration)
  group.get('/login', import('./handlers/login'), [redirectIfAuth()]);
  group.post('/login', import('./handlers/authenticate'));
  
  group.get('/register', import('./handlers/register'), [redirectIfAuth()]);
  group.post('/register', import('./handlers/processRegistration'));
  
  // Logout (POST because it changes state)
  group.post('/logout', import('./handlers/logout'), [requireAuth()]);
  
  // Protected routes
  group.get('/dashboard', import('./handlers/dashboard'), [requireAuth()]);
  
  // Future routes:
  // group.get('/schemas', import('./handlers/schemas/list'), [requireAuth()]);
  // group.get('/schemas/create', import('./handlers/schemas/create'), [requireAuth()]);
  // group.post('/schemas', import('./handlers/schemas/create'), [requireAuth()]);
  // group.get('/content', import('./handlers/content/list'), [requireAuth()]);
}
