import { describe, it, expect, beforeEach } from 'bun:test';
import { requireAuth, redirectIfAuth } from '../middleware';
import { createSession, createSessionCookie } from '../../session';
import { container } from '../../../src/container';
import { MemorySessionStore } from '../../session/stores/memory';
import type { RequestContext } from '../../router/types';

describe('Auth middleware', () => {
  beforeEach(() => {
    container.clear();
    container.register('session', () => ({
      store: new MemorySessionStore(),
    }));
  });

  describe('requireAuth', () => {
    it('redirects to login when no session', async () => {
      const middleware = requireAuth();
      const request = new Request('http://localhost:3000/admin/dashboard');
      const ctx: RequestContext = {
        request,
        params: {},
        query: new URLSearchParams(),
        url: new URL(request.url),
      };

      const next = async () => new Response('Protected content');
      const response = await middleware(ctx, next);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/admin/login');
      expect(response.headers.get('location')).toContain('return=');
    });

    it('calls next() when session is valid', async () => {
      const session = await createSession('admin');
      
      const middleware = requireAuth();
      const request = new Request('http://localhost:3000/admin/dashboard', {
        headers: {
          cookie: createSessionCookie(session),
        },
      });
      const ctx: RequestContext = {
        request,
        params: {},
        query: new URLSearchParams(),
        url: new URL(request.url),
      };

      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
        return new Response('Protected content');
      };

      const response = await middleware(ctx, next);

      expect(nextCalled).toBe(true);
      expect(response.status).toBe(200);
      expect(ctx.session).toBeDefined();
      expect(ctx.session?.userId).toBe('admin');
    });

    it('uses custom onUnauthorized handler', async () => {
      const middleware = requireAuth({
        onUnauthorized: () => new Response('Custom unauthorized', { status: 401 }),
      });
      
      const request = new Request('http://localhost:3000/admin/dashboard');
      const ctx: RequestContext = {
        request,
        params: {},
        query: new URLSearchParams(),
        url: new URL(request.url),
      };

      const next = async () => new Response('Protected content');
      const response = await middleware(ctx, next);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Custom unauthorized');
    });
  });

  describe('redirectIfAuth', () => {
    it('redirects to dashboard when session exists', async () => {
      const session = await createSession('admin');
      
      const middleware = redirectIfAuth();
      const request = new Request('http://localhost:3000/admin/login', {
        headers: {
          cookie: createSessionCookie(session),
        },
      });
      const ctx: RequestContext = {
        request,
        params: {},
        query: new URLSearchParams(),
        url: new URL(request.url),
      };

      const next = async () => new Response('Login page');
      const response = await middleware(ctx, next);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/admin/dashboard');
    });

    it('calls next() when no session', async () => {
      const middleware = redirectIfAuth();
      const request = new Request('http://localhost:3000/admin/login');
      const ctx: RequestContext = {
        request,
        params: {},
        query: new URLSearchParams(),
        url: new URL(request.url),
      };

      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
        return new Response('Login page');
      };

      const response = await middleware(ctx, next);

      expect(nextCalled).toBe(true);
      expect(response.status).toBe(200);
    });

    it('redirects to custom path', async () => {
      const session = await createSession('admin');
      
      const middleware = redirectIfAuth('/custom/path');
      const request = new Request('http://localhost:3000/admin/login', {
        headers: {
          cookie: createSessionCookie(session),
        },
      });
      const ctx: RequestContext = {
        request,
        params: {},
        query: new URLSearchParams(),
        url: new URL(request.url),
      };

      const next = async () => new Response('Login page');
      const response = await middleware(ctx, next);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/custom/path');
    });
  });
});
