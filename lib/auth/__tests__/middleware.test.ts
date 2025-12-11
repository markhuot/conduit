import { describe, it, expect, beforeEach } from 'bun:test';
import { requireAuth, redirectIfAuth } from '../middleware';
import { createSession, createSessionCookie } from '../../session';
import { container } from '../../../src/container';
import { MemorySessionStore } from '../../session/stores/memory';
import { RedirectError, UnauthorizedError } from '../../router/errors';
import type { RequestContext } from '../../router/types';

describe('Auth middleware', () => {
  beforeEach(() => {
    container.clear();
    container.register('session', () => ({
      store: new MemorySessionStore(),
    }));
  });

  describe('requireAuth', () => {
    it('throws RedirectError when no session', async () => {
      const middleware = requireAuth();
      const request = new Request('http://localhost:3000/admin/dashboard');
      const ctx: RequestContext = {
        request,
        params: {},
        query: new URLSearchParams(),
        url: new URL(request.url),
      };

      const next = async () => new Response('Protected content');
      
      try {
        await middleware(ctx, next);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(RedirectError);
        expect((error as RedirectError).headers.Location).toContain('/admin/login');
        expect((error as RedirectError).headers.Location).toContain('return=');
      }
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
        onUnauthorized: () => { throw new UnauthorizedError('Custom unauthorized') },
      });
      
      const request = new Request('http://localhost:3000/admin/dashboard');
      const ctx: RequestContext = {
        request,
        params: {},
        query: new URLSearchParams(),
        url: new URL(request.url),
      };

      const next = async () => new Response('Protected content');
      
      try {
        await middleware(ctx, next);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).message).toBe('Custom unauthorized');
      }
    });
  });

  describe('redirectIfAuth', () => {
    it('throws RedirectError when session exists', async () => {
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
      
      try {
        await middleware(ctx, next);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(RedirectError);
        expect((error as RedirectError).headers.Location).toBe('/admin/dashboard');
      }
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

    it('throws RedirectError to custom path', async () => {
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
      
      try {
        await middleware(ctx, next);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(RedirectError);
        expect((error as RedirectError).headers.Location).toBe('/custom/path');
      }
    });
  });
});
