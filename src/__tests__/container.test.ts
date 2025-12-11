import { describe, it, expect, beforeEach } from 'bun:test';
import { container, register, resolve, set, has } from '../../lib/container';

describe('Service Container', () => {
  beforeEach(() => {
    container.clear();
  });

  it('registers and resolves services with factory', () => {
    register('test', () => ({ value: 42 }));
    const service = resolve<{ value: number }>('test');
    expect(service.value).toBe(42);
  });

  it('throws for unregistered services', () => {
    expect(() => resolve('unknown')).toThrow('Service "unknown" not registered');
  });

  it('creates singletons', () => {
    register('test', () => ({ value: Math.random() }));
    const first = resolve('test');
    const second = resolve('test');
    expect(first).toBe(second);
  });

  it('sets service instances directly', () => {
    set('test', { value: 100 });
    const service = resolve<{ value: number }>('test');
    expect(service.value).toBe(100);
  });

  it('checks if service is registered', () => {
    expect(has('test')).toBe(false);
    register('test', () => ({ value: 42 }));
    expect(has('test')).toBe(true);
  });

  it('checks if service is set', () => {
    expect(has('test')).toBe(false);
    set('test', { value: 100 });
    expect(has('test')).toBe(true);
  });

  it('clears all services', () => {
    register('test1', () => ({ value: 1 }));
    set('test2', { value: 2 });
    expect(has('test1')).toBe(true);
    expect(has('test2')).toBe(true);
    
    container.clear();
    
    expect(has('test1')).toBe(false);
    expect(has('test2')).toBe(false);
  });
});
