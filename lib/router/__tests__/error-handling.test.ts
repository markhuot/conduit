import { describe, it, expect } from 'bun:test';
import { Router } from '../index';
import {
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
  ValidationError,
  RedirectError,
} from '../errors';
import type { Middleware, RequestContext } from '../types';

describe('Router Error Handling', () => {
  it('catches NotFoundError thrown in handler', async () => {
    const router = new Router();
    router.get('/test', (_ctx) => {
      throw new NotFoundError('Resource not found');
    });

    const request = new Request('http://localhost/test');
    const response = await router.handle(request);

    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    
    const body = await response.json();
    expect(body.error.message).toBe('Resource not found');
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('catches UnauthorizedError thrown in middleware', async () => {
    const router = new Router();
    
    const authMiddleware: Middleware = async (_ctx, _next) => {
      throw new UnauthorizedError('Not logged in');
    };
    
    router.get('/protected', async (_ctx) => {
      return new Response('secret data');
    }, [authMiddleware]);

    const request = new Request('http://localhost/protected');
    const response = await router.handle(request);

    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('catches ValidationError with field errors', async () => {
    const router = new Router();
    
    router.post('/submit', async (_ctx) => {
      throw new ValidationError('Invalid data', {
        email: ['Email is required'],
        password: ['Password too short'],
      });
    });

    const request = new Request('http://localhost/submit', { method: 'POST' });
    const response = await router.handle(request);

    expect(response.status).toBe(422);
    
    const body = await response.json();
    expect(body.error.errors).toEqual({
      email: ['Email is required'],
      password: ['Password too short'],
    });
  });

  it('catches RedirectError and returns redirect', async () => {
    const router = new Router();
    
    router.get('/old', (_ctx) => {
      throw new RedirectError('/new');
    });

    const request = new Request('http://localhost/old');
    const response = await router.handle(request);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/new');
    expect(response.body).toBeNull();
  });

  it('catches RedirectError with custom headers', async () => {
    const router = new Router();
    
    router.get('/logout', (_ctx) => {
      throw new RedirectError('/login', {
        status: 302,
        headers: {
          'Set-Cookie': 'session=; Max-Age=0',
        },
      });
    });

    const request = new Request('http://localhost/logout');
    const response = await router.handle(request);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login');
    expect(response.headers.get('Set-Cookie')).toBe('session=; Max-Age=0');
  });

  it('returns 404 for unmatched routes', async () => {
    const router = new Router();
    router.get('/exists', (_ctx) => new Response('ok'));

    const request = new Request('http://localhost/does-not-exist');
    const response = await router.handle(request);

    expect(response.status).toBe(404);
    
    const body = await response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('Route not found');
  });

  it('catches errors thrown in async handlers', async () => {
    const router = new Router();
    
    router.get('/async-error', async (_ctx) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      throw new BadRequestError('Something went wrong');
    });

    const request = new Request('http://localhost/async-error');
    const response = await router.handle(request);

    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('catches errors thrown in middleware chain', async () => {
    const router = new Router();
    
    const middleware1: Middleware = async (_ctx, next) => {
      return next();
    };
    
    const middleware2: Middleware = async (_ctx, _next) => {
      throw new UnauthorizedError('Failed at step 2');
    };
    
    const middleware3: Middleware = async (_ctx, next) => {
      return next();
    };
    
    router.get('/test', async (_ctx: RequestContext) => {
      return new Response('should not reach here');
    }, [middleware1, middleware2, middleware3]);

    const request = new Request('http://localhost/test');
    const response = await router.handle(request);

    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('includes custom headers from error', async () => {
    const router = new Router();
    
    router.get('/rate-limited', (_ctx) => {
      throw new BadRequestError('Too fast', undefined, {
        'X-Rate-Limit': '100',
        'X-Custom': 'value',
      });
    });

    const request = new Request('http://localhost/rate-limited');
    const response = await router.handle(request);

    expect(response.headers.get('X-Rate-Limit')).toBe('100');
    expect(response.headers.get('X-Custom')).toBe('value');
  });

  it('handles unexpected errors with 500 status', async () => {
    const router = new Router();
    
    router.get('/crash', (_ctx) => {
      throw new Error('Unexpected crash');
    });

    const request = new Request('http://localhost/crash');
    const response = await router.handle(request);

    expect(response.status).toBe(500);
    
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('propagates errors through global middleware', async () => {
    const router = new Router();
    
    let middlewareRan = false;
    
    router.use(async (_ctx, next) => {
      middlewareRan = true;
      return next();
    });
    
    router.get('/error', (_ctx) => {
      throw new NotFoundError('Not here');
    });

    const request = new Request('http://localhost/error');
    const response = await router.handle(request);

    expect(middlewareRan).toBe(true);
    expect(response.status).toBe(404);
  });
});
