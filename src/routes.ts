import { Router } from '../lib/router';
import { cors } from './middleware/cors';
import { simpleLogger } from './middleware/logging';
import { staticFiles } from './middleware/static';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Application routes
 * Laravel-style route registration
 */
export function registerRoutes(router: Router): void {
  // Register global middleware
  router.use(cors());
  router.use(simpleLogger());

  // Check if frontend build exists (production mode)
  const publicDir = join(process.cwd(), 'dist/public');
  const hasFrontendBuild = existsSync(publicDir);

  if (hasFrontendBuild) {
    // In production: serve static files and SPA
    router.use(staticFiles({
      publicDir: 'dist/public',
      spa: true,
      exclude: ['/api*'], // Don't serve static files for API routes
    }));
  } else {
    // In development: serve API info on homepage
    router.get('/', import('./handlers/home'));
  }

  // API routes (these work in both dev and production)
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
