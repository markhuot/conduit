import type { RequestContext } from '../../router/types';
import { ui } from '../../router/react/response';
import { LoginForm } from '../ui/LoginForm';

/**
 * GET /admin/login
 * Show login form
 * Flash messages automatically available in context
 */
export default async function login(ctx: RequestContext): Promise<Response> {
  const returnTo = ctx.query.get('return') || '/admin/dashboard';
  
  return ui(<LoginForm returnTo={returnTo} />);
}
