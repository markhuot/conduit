import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { FileUserStore } from '../stores/file';
import { rmSync } from 'fs';
import type { User } from '../types';

describe('FileUserStore', () => {
  const testDir = 'data/test-users';
  let store: FileUserStore;

  beforeEach(() => {
    store = new FileUserStore(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates a user', async () => {
    const user: User = {
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      createdAt: Date.now(),
    };

    await store.create(user);

    const found = await store.findById('user_123');
    expect(found).not.toBeNull();
    expect(found!.email).toBe('test@example.com');
  });

  it('finds user by email', async () => {
    const user: User = {
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      createdAt: Date.now(),
    };

    await store.create(user);

    const found = await store.findByEmail('test@example.com');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('user_123');
  });

  it('returns null for non-existent user', async () => {
    const found = await store.findByEmail('nonexistent@example.com');
    expect(found).toBeNull();
  });

  it('checks if user exists', async () => {
    const user: User = {
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      createdAt: Date.now(),
    };

    await store.create(user);

    expect(await store.exists('test@example.com')).toBe(true);
    expect(await store.exists('other@example.com')).toBe(false);
  });

  it('finds user by id', async () => {
    const user: User = {
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      createdAt: Date.now(),
    };

    await store.create(user);

    const found = await store.findById('user_123');
    expect(found).not.toBeNull();
    expect(found!.email).toBe('test@example.com');
  });

  it('returns null for non-existent id', async () => {
    const found = await store.findById('nonexistent_id');
    expect(found).toBeNull();
  });
});
