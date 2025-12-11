/**
 * Service container for dependency injection
 * Supports lazy initialization and singleton pattern
 * 
 * Services are registered once (usually in config/) and resolved everywhere.
 * This pattern enables pluggable backends for session, search, SEO, layouts, etc.
 */
class Container {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  /**
   * Register a service factory
   * Factory is called once on first get()
   */
  register<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  /**
   * Register a service instance directly
   */
  set<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  /**
   * Get a service instance
   * Initializes from factory if not already created
   */
  get<T>(name: string): T {
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service "${name}" not registered. Did you forget to configure it in config/?`);
    }

    const instance = factory();
    this.services.set(name, instance);
    return instance;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

// Global service container
export const container = new Container();

/**
 * Helper to register services with type safety
 */
export function register<T>(name: string, factory: () => T): void {
  container.register(name, factory);
}

/**
 * Helper to resolve services with type safety
 */
export function resolve<T>(name: string): T {
  return container.get<T>(name);
}

/**
 * Helper to set service instances directly
 */
export function set<T>(name: string, instance: T): void {
  container.set(name, instance);
}

/**
 * Helper to check if service is registered
 */
export function has(name: string): boolean {
  return container.has(name);
}
