import type { RequestContext } from '../../router/types';
import { ui } from '../../router/react/response';
import { Dashboard } from '../ui/Dashboard';

/**
 * GET /admin/dashboard
 * Show admin dashboard (requires auth)
 * Layout automatically used from container
 */
export default function dashboard(ctx: RequestContext): Promise<Response> {
  // Session available in ctx.session (set by auth middleware)
  return ui(<Dashboard session={ctx.session!} />);
}
