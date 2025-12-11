import { resolve } from '../container';

/**
 * Flash messages from session
 */
export interface FlashMessages {
  error?: string;
  success?: string;
  info?: string;
  errors?: Record<string, string[]>;  // Field-specific errors
}

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  flash?: FlashMessages;
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

/**
 * Flash message helpers
 * Flash messages are stored in session and cleared after being read once
 */

/**
 * Set a flash error message in session
 * Creates a temporary session if user is not logged in
 */
export async function setFlashError(sessionId: string | null, message: string): Promise<Session> {
  let session: Session | null = sessionId ? await getSession(sessionId) : null;
  
  if (!session) {
    // Create temporary session for flash message
    session = {
      id: crypto.randomUUID(),
      userId: '', // Empty for temporary sessions
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
      flash: { error: message },
    };
  } else {
    session.flash = { ...session.flash, error: message };
  }
  
  await getSessionStore().set(session);
  return session;
}

/**
 * Set field-specific validation errors
 * errors = { email: ['Email already taken'], password: ['Too short', 'No special chars'] }
 */
export async function setFlashErrors(sessionId: string | null, errors: Record<string, string[]>): Promise<Session> {
  let session: Session | null = sessionId ? await getSession(sessionId) : null;
  
  if (!session) {
    session = {
      id: crypto.randomUUID(),
      userId: '',
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000),
      flash: { errors },
    };
  } else {
    session.flash = { ...session.flash, errors };
  }
  
  await getSessionStore().set(session);
  return session;
}

/**
 * Set a flash success message in session
 */
export async function setFlashSuccess(sessionId: string | null, message: string): Promise<Session> {
  let session: Session | null = sessionId ? await getSession(sessionId) : null;
  
  if (!session) {
    session = {
      id: crypto.randomUUID(),
      userId: '',
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000),
      flash: { success: message },
    };
  } else {
    session.flash = { ...session.flash, success: message };
  }
  
  await getSessionStore().set(session);
  return session;
}

/**
 * Get and clear flash messages from session
 * Returns the flash messages and removes them from the session
 */
export async function getFlash(sessionId: string | null): Promise<FlashMessages | undefined> {
  if (!sessionId) return undefined;
  
  const session = await getSession(sessionId);
  if (!session || !session.flash) return undefined;
  
  const flash = session.flash;
  
  // Clear flash messages from session
  session.flash = undefined;
  await getSessionStore().set(session);
  
  return flash;
}

/**
 * Get session ID from request cookie
 */
export function getSessionIdFromRequest(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  
  const sessionId = cookie
    .split(';')
    .find(c => c.trim().startsWith('session='))
    ?.split('=')[1];
  
  return sessionId || null;
}
