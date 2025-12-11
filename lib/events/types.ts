/**
 * Event sourcing type definitions
 * 
 * These types define the contract for events, listeners, and event writers.
 * Events are immutable records of what happened in the system.
 */

/**
 * Base event interface - minimal contract all events must satisfy
 */
export interface BaseEvent {
  id: string;           // Unique event ID (e.g., "evt_abc123")
  timestamp: number;    // Unix timestamp (milliseconds)
  type: string;         // Event type discriminator
  data: unknown;        // Event payload
}

/**
 * User registered event
 * Emitted when a new user completes registration
 */
export interface UserRegisteredEvent extends BaseEvent {
  type: 'user.registered';
  data: {
    userId: string;
    email: string;
    passwordHash: string;  // Already hashed with argon2
    createdAt: number;     // Unix timestamp
  };
}

/**
 * Core event union type (extensible)
 * Add new event types here as features are implemented
 */
export type CoreEvent = 
  | UserRegisteredEvent
  // Future events:
  // | SchemaCreatedEvent
  // | ContentCreatedEvent
  // | AssetUploadedEvent
  ;

/**
 * Event listener interface
 * Generic design allows third-party events without modifying core
 * 
 * IMPORTANT: Each listener implements its own event reading mechanism.
 * The listener decides HOW it reads events (file watcher, S3 events, Redis stream, etc.)
 */
export interface EventListener<T extends BaseEvent = BaseEvent> {
  /**
   * Event types this listener handles
   * Use string array for flexibility with third-party events
   */
  subscribesTo: readonly string[];
  
  /**
   * Handle an event
   * Should be idempotent - safe to call multiple times with same event
   */
  handle(event: T): Promise<void>;
}

/**
 * Event writer interface
 * Implement this for different storage backends (file, Redis, D1, etc.)
 * 
 * This is WRITE-ONLY. Listeners implement their own reading mechanisms.
 * 
 * Note: No initialize() method - constructors handle setup.
 * For async initialization (database connections), handle in container registration.
 */
export interface EventWriter {
  /**
   * Write an event to storage
   * Must be atomic and durable
   */
  write(event: BaseEvent): Promise<void>;
}
