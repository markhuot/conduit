import { describe, it, expect, beforeEach } from 'bun:test';
import { createSession, getSession, deleteSession } from '../index';
import { container } from '../../container';
import { MemorySessionStore } from '../stores/memory';

describe('Session management', () => {
  beforeEach(() => {
    container.clear();
    container.register('session', () => ({
      store: new MemorySessionStore(),
    }));
  });

  it('creates a new session', async () => {
    const session = await createSession('admin');
    expect(session.userId).toBe('admin');
    expect(session.id).toBeDefined();
    expect(typeof session.id).toBe('string');
    expect(session.createdAt).toBeDefined();
    expect(session.expiresAt).toBeDefined();
    expect(session.expiresAt > session.createdAt).toBe(true);
  });
  
  it('retrieves existing session', async () => {
    const session = await createSession('admin');
    const retrieved = await getSession(session.id);
    expect(retrieved).toEqual(session);
  });
  
  it('returns null for non-existent session', async () => {
    const retrieved = await getSession('non-existent-id');
    expect(retrieved).toBeNull();
  });
  
  it('deletes session', async () => {
    const session = await createSession('admin');
    await deleteSession(session.id);
    expect(await getSession(session.id)).toBeNull();
  });

  it('expires old sessions', async () => {
    const store = new MemorySessionStore();
    container.clear();
    container.register('session', () => ({ store }));

    // Create a session that's already expired
    const expiredSession = {
      id: 'test-id',
      userId: 'admin',
      createdAt: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
      expiresAt: Date.now() - (24 * 60 * 60 * 1000), // expired yesterday
    };

    await store.set(expiredSession);
    const retrieved = await getSession(expiredSession.id);
    expect(retrieved).toBeNull();
  });
});
