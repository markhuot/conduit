import type { RequestContext } from '../../router/types';
import { redirect } from '../../router/response';
import { createSession, createSessionCookie } from '../../session';

// TODO: Move to database or environment variables
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin', // In production: hash with argon2
};

/**
 * POST /admin/login
 * Authenticate user and create session
 * Uses native FormData from HTML form submission
 */
export default async function authenticate(
  ctx: RequestContext
): Promise<Response> {
  // Parse form data (native web platform FormData API)
  const formData = await ctx.request.formData();
  const username = formData.get('username')?.toString();
  const password = formData.get('password')?.toString();
  const returnTo = formData.get('return')?.toString() || '/admin/dashboard';
  
  // Validate credentials
  if (!username || !password) {
    return redirect('/admin/login?error=' + encodeURIComponent('Username and password required'));
  }
  
  // Check credentials (replace with database lookup in production)
  if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
    return redirect('/admin/login?error=' + encodeURIComponent('Invalid credentials'));
  }
  
  // Create session
  const session = await createSession(username);
  
  // Set cookie and redirect
  const response = redirect(returnTo);
  response.headers.append('Set-Cookie', createSessionCookie(session));
  
  return response;
}
