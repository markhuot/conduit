import type { SessionStore, Session } from '../index';

/**
 * In-memory session store (for local development)
 * 
 * WARNING: NOT suitable for production
 * - Sessions lost on server restart
 * - No multi-instance support
 * - No persistence
 * 
 * Use Redis/D1/KV for production.
 */
export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, Session>();

  async get(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) return null;
    
    // Check expiration
    if (session.expiresAt < Date.now()) {
      await this.delete(sessionId);
      return null;
    }
    
    return session;
  }

  async set(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}
