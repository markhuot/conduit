/**
 * POST /admin/register
 * Process registration and emit UserRegistered event
 * 
 * This handler ONLY validates and emits the event.
 * The UserListener handles writing to the user store.
 * Errors are stored in session flash messages for security.
 */

import type { RequestContext } from '../../router/types';
import { redirect } from '../../router/response';
import { resolve } from '../../../src/container';
import type { UserConfig } from '../../users/types';
import type { UserRegisteredEvent } from '../../events/types';
import type { EventStore } from '../../events/store';
import { setFlashError, setFlashSuccess, setFlashErrors, getSessionIdFromRequest, createSessionCookie } from '../../session';

export default async function processRegistration(
  context: RequestContext
): Promise<Response> {
  const formData = await context.request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const passwordConfirm = formData.get('passwordConfirm')?.toString();

  const sessionId = getSessionIdFromRequest(context.request);

  // Validation
  if (!email || !password || !passwordConfirm) {
    const session = await setFlashError(sessionId, 'All fields required');
    const response = redirect('/admin/register');
    response.headers.append('Set-Cookie', createSessionCookie(session));
    return response;
  }

  if (password !== passwordConfirm) {
    const session = await setFlashError(sessionId, 'Passwords do not match');
    const response = redirect('/admin/register');
    response.headers.append('Set-Cookie', createSessionCookie(session));
    return response;
  }

  if (password.length < 8) {
    const session = await setFlashError(sessionId, 'Password must be at least 8 characters');
    const response = redirect('/admin/register');
    response.headers.append('Set-Cookie', createSessionCookie(session));
    return response;
  }

  // Check if email already exists (read-only query)
  const { store } = resolve<UserConfig>('users');
  const exists = await store.exists(email);
  
  if (exists) {
    const session = await setFlashErrors(sessionId, {
      email: ['Email already registered']
    });
    const response = redirect('/admin/register');
    response.headers.append('Set-Cookie', createSessionCookie(session));
    return response;
  }

  // Hash password with argon2
  const passwordHash = await hashPassword(password);

  // Generate user ID
  const userId = `user_${crypto.randomUUID()}`;

  // Emit UserRegistered event
  const eventStore = resolve<EventStore>('eventStore');
  const event: UserRegisteredEvent = {
    id: '', // Will be assigned by event store
    timestamp: 0, // Will be assigned by event store
    type: 'user.registered',
    data: {
      userId,
      email,
      passwordHash,
      createdAt: Date.now(),
    },
  };

  await eventStore.emit(event);

  // Set success flash and redirect to login
  const session = await setFlashSuccess(sessionId, 'Account created successfully! Please log in.');
  const response = redirect('/admin/login');
  response.headers.append('Set-Cookie', createSessionCookie(session));
  return response;
}

/**
 * Hash password with argon2
 */
async function hashPassword(password: string): Promise<string> {
  // Use Bun's built-in argon2 support
  return await Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
  });
}
