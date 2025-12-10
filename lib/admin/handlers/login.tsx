import type { RequestContext } from '../../router/types';
import { ui } from '../../router/react/response';
import { LoginForm } from '../ui/LoginForm';

/**
 * GET /admin/login
 * Show login form
 * Layout automatically used from container
 */
export default function login(ctx: RequestContext): Promise<Response> {
  const error = ctx.query.get('error');
  const returnTo = ctx.query.get('return') || '/admin/dashboard';
  
  return ui(<LoginForm error={error} returnTo={returnTo} />);
}
