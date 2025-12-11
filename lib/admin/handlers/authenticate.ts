import type { RequestContext } from '../../router/types';
import { RedirectError } from '../../router/errors';
import { createSession, createSessionCookie, setFlashError, getSessionIdFromRequest } from '../../session';
import { resolve } from '../../../src/container';
import type { UserConfig } from '../../users/types';

/**
 * POST /admin/login
 * Authenticate user and create session
 * Uses user store and stores errors in session flash messages
 */
export default async function authenticate(
  ctx: RequestContext
): Promise<Response> {
  const formData = await ctx.request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const returnTo = formData.get('return')?.toString() || '/admin/dashboard';
  
  const sessionId = getSessionIdFromRequest(ctx.request);
  
  // Validate input
  if (!email || !password) {
    const session = await setFlashError(sessionId, 'Email and password required');
    throw new RedirectError('/admin/login', {
      headers: {
        'Set-Cookie': createSessionCookie(session),
      },
    });
  }
  
  // Lookup user in store
  const { store } = resolve<UserConfig>('users');
  const user = await store.findByEmail(email);
  
  if (!user) {
    const session = await setFlashError(sessionId, 'Invalid credentials');
    throw new RedirectError('/admin/login', {
      headers: {
        'Set-Cookie': createSessionCookie(session),
      },
    });
  }
  
  // Verify password
  const valid = await Bun.password.verify(password, user.passwordHash);
  
  if (!valid) {
    const session = await setFlashError(sessionId, 'Invalid credentials');
    throw new RedirectError('/admin/login', {
      headers: {
        'Set-Cookie': createSessionCookie(session),
      },
    });
  }
  
  // Create session (use user ID instead of email)
  const session = await createSession(user.id);
  
  // Set cookie and redirect
  throw new RedirectError(returnTo, {
    headers: {
      'Set-Cookie': createSessionCookie(session),
    },
  });
}
