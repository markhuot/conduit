import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EventStore } from '../store';
import { FileEventWriter } from '../writers/file';
import { rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { BaseEvent, EventListener } from '../types';

describe('EventStore', () => {
  const testDir = 'data/test-events';
  let store: EventStore;

  beforeEach(() => {
    const writer = new FileEventWriter(testDir);
    store = new EventStore(writer);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('emits and persists events', async () => {
    const event: BaseEvent = {
      id: '',
      timestamp: 0,
      type: 'test.event',
      data: { foo: 'bar' },
    };

    await store.emit(event);

    // Verify event was written to file
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const filename = join(testDir, `${year}-${month}-${day}.jsonl`);

    expect(existsSync(filename)).toBe(true);

    const content = readFileSync(filename, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const savedEvent = JSON.parse(lines[0]!);
    expect(savedEvent.type).toBe('test.event');
    expect(savedEvent.data).toEqual({ foo: 'bar' });
  });

  it('assigns ID and timestamp', async () => {
    const event: BaseEvent = {
      id: '',
      timestamp: 0,
      type: 'test.event',
      data: {},
    };

    await store.emit(event);

    // Read event from file
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const filename = join(testDir, `${year}-${month}-${day}.jsonl`);

    const content = readFileSync(filename, 'utf-8');
    const savedEvent = JSON.parse(content.trim());

    expect(savedEvent.id).toMatch(/^evt_/);
    expect(savedEvent.timestamp).toBeGreaterThan(0);
  });

  it('notifies subscribed listeners', async () => {
    const receivedEvents: BaseEvent[] = [];

    const listener: EventListener = {
      subscribesTo: ['test.event'],
      async handle(event: BaseEvent) {
        receivedEvents.push(event);
      },
    };

    store.subscribe(listener);

    const event: BaseEvent = {
      id: '',
      timestamp: 0,
      type: 'test.event',
      data: { message: 'hello' },
    };

    await store.emit(event);

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]!.type).toBe('test.event');
    expect(receivedEvents[0]!.data).toEqual({ message: 'hello' });
  });

  it('only notifies listeners subscribed to event type', async () => {
    const receivedEvents: BaseEvent[] = [];

    const listener: EventListener = {
      subscribesTo: ['other.event'],
      async handle(event: BaseEvent) {
        receivedEvents.push(event);
      },
    };

    store.subscribe(listener);

    const event: BaseEvent = {
      id: '',
      timestamp: 0,
      type: 'test.event',
      data: {},
    };

    await store.emit(event);

    expect(receivedEvents).toHaveLength(0);
  });

  it('continues emitting even if listener fails', async () => {
    const failingListener: EventListener = {
      subscribesTo: ['test.event'],
      async handle() {
        throw new Error('Listener failure');
      },
    };

    store.subscribe(failingListener);

    const event: BaseEvent = {
      id: '',
      timestamp: 0,
      type: 'test.event',
      data: {},
    };

    // Should not throw
    await expect(store.emit(event)).resolves.toBeUndefined();

    // Event should still be persisted
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const filename = join(testDir, `${year}-${month}-${day}.jsonl`);

    expect(existsSync(filename)).toBe(true);
  });
});
