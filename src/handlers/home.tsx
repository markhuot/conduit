import type { RequestContext } from '../../lib/router/types';
import { ui } from '../../lib/router/react/response';
import { Homepage } from '../ui/components/Homepage';

/**
 * Homepage handler
 * Server-side renders the React Homepage component
 */
export default async function home(ctx: RequestContext): Promise<Response> {
  return ui(<Homepage />, {
    title: 'Project Conduit',
  });
}
