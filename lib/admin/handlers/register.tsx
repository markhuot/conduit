/**
 * GET /admin/register
 * Show registration form
 * Flash messages automatically available in context
 */

import type { RequestContext } from '../../router/types';
import { ui } from '../../router/react/response';
import { RegistrationForm } from '../ui/RegistrationForm';

export default async function register(_context: RequestContext): Promise<Response> {
  return ui(<RegistrationForm />);
}
