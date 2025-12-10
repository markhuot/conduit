import { Router } from '../lib/router';
import { adminRoutes } from '../lib/admin/routes';
import { cors } from '../lib/middleware/cors';
import { simpleLogger } from '../lib/middleware/logging';

/**
 * Application routes
 */
export function registerRoutes(router: Router): void {
  // Register global middleware
  router.use(cors());
  router.use(simpleLogger());

  // Serve static files from public directory
  router.static('public');

  // Homepage route
  router.get('/', import('./handlers/home'));

  // Admin panel (drop-in from library)
  router.group('/admin', adminRoutes);

  // Future routes will be added here
  // Example routes from spec (not implemented yet):
  
  // Content routes
  // router.get('/posts', import('./handlers/posts/list'));
  // router.get('/posts/:id', import('./handlers/posts/show'));
  // router.post('/posts', import('./handlers/posts/create'));
  // router.put('/posts/:id', import('./handlers/posts/update'));
  // router.delete('/posts/:id', import('./handlers/posts/delete'));
  
  // Authors routes
  // router.get('/authors', import('./handlers/authors/list'));
  // router.get('/authors/:id', import('./handlers/authors/show'));
  
  // CMS/Admin routes
  // router.get('/api/schemas', import('./handlers/schemas/list'));
  // router.post('/api/schemas', import('./handlers/schemas/create'));
}
