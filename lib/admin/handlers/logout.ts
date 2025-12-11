import type { RequestContext } from '../../router/types';
import { RedirectError } from '../../router/errors';
import { deleteSession, getSessionFromRequest, createLogoutCookie } from '../../session';

/**
 * POST /admin/logout
 * Destroy session and redirect to login
 * POST because it changes server state (destroys session)
 */
export default async function logout(
  ctx: RequestContext
): Promise<Response> {
  const session = await getSessionFromRequest(ctx.request);
  
  if (session) {
    await deleteSession(session.id);
  }
  
  throw new RedirectError('/admin/login', {
    headers: {
      'Set-Cookie': createLogoutCookie(),
    },
  });
}
