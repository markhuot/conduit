import { Router } from '../lib/router';
import { cors } from './middleware/cors';
import { simpleLogger } from './middleware/logging';

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

  // API routes
  router.get('/api/info', import('./handlers/home'));

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
