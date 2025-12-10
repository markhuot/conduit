import type { RequestContext } from '../../router/types';
import { redirect } from '../../router/response';
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
  
  const response = redirect('/admin/login');
  response.headers.append('Set-Cookie', createLogoutCookie());
  
  return response;
}
