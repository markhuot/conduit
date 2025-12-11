import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { UserListener } from '../user';
import { FileUserStore } from '../../users/stores/file';
import { container } from '../../container';
import { rmSync } from 'fs';
import type { UserRegisteredEvent } from '../../events/types';

describe('UserListener', () => {
  const testDir = 'data/test-users-listener';
  let listener: UserListener;
  let userStore: FileUserStore;

  beforeEach(() => {
    // Setup container
    container.clear();
    userStore = new FileUserStore(testDir);
    container.set('users', { store: userStore });
    
    listener = new UserListener();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    container.clear();
  });

  it('handles user.registered event', async () => {
    const event: UserRegisteredEvent = {
      id: 'evt_123',
      timestamp: Date.now(),
      type: 'user.registered',
      data: {
        userId: 'user_123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        createdAt: Date.now(),
      },
    };

    await listener.handle(event);

    const user = await userStore.findById('user_123');
    expect(user).not.toBeNull();
    expect(user!.email).toBe('test@example.com');
  });

  it('is idempotent - handles duplicate events gracefully', async () => {
    const event: UserRegisteredEvent = {
      id: 'evt_123',
      timestamp: Date.now(),
      type: 'user.registered',
      data: {
        userId: 'user_123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        createdAt: Date.now(),
      },
    };

    // Handle event twice
    await listener.handle(event);
    await listener.handle(event);

    // Should still have only one user
    const user = await userStore.findById('user_123');
    expect(user).not.toBeNull();
    expect(user!.email).toBe('test@example.com');
  });

  it('subscribes to user.registered events', () => {
    expect(listener.subscribesTo).toContain('user.registered');
  });
});
