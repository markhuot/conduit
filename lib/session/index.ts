import { resolve } from '../../src/container';

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Session store interface
 * Implement this for different storage backends (memory, Redis, D1, KV)
 */
export interface SessionStore {
  get(sessionId: string): Promise<Session | null>;
  set(session: Session): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  store: SessionStore;
}

/**
 * Get the configured session store from container
 */
function getSessionStore(): SessionStore {
  const config = resolve<SessionConfig>('session');
  return config.store;
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<Session> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const session: Session = {
    id,
    userId,
    createdAt: now,
    expiresAt: now + (7 * 24 * 60 * 60 * 1000), // 7 days
  };
  
  await getSessionStore().set(session);
  return session;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  return getSessionStore().get(sessionId);
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  return getSessionStore().delete(sessionId);
}

/**
 * Get session cookie from request
 */
export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  
  const sessionId = cookie
    .split(';')
    .find(c => c.trim().startsWith('session='))
    ?.split('=')[1];
  
  if (!sessionId) return null;
  
  return getSession(sessionId);
}

/**
 * Create session cookie header
 */
export function createSessionCookie(session: Session): string {
  return `session=${session.id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`;
}

/**
 * Create logout cookie header (expires immediately)
 */
export function createLogoutCookie(): string {
  return 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}
