# User Registration & Event Sourcing Specification

**Spec ID**: 2025120803  
**Created**: 2025-12-10  
**Updated**: 2025-12-10  
**Status**: 🔨 In Progress  
**Phase**: Event Sourcing Foundation  
**Dependencies**: 2025120802-admin.md

## Overview

This spec defines the first event-sourced feature for Project Conduit: user registration. This implementation establishes the core event sourcing pattern that will be used throughout the system.

**Key Features:**
1. Event-driven user registration at `/admin/register`
2. Events written to append-only event log
3. Event listeners write to persistent stores
4. Clear separation between event emission and side effects
5. Foundation for all future event-sourced features
6. **Convention-based bootstrapping** - config files initialize their own services, keeping server.ts clean

**Implementation Status:** 🔨 Planning Phase

**Architectural Note:** This spec establishes a critical convention where each `config/*.ts` file is responsible for creating, initializing, and registering its own services. This keeps `src/server.ts` minimal (just imports) and provides a clear pattern for future stores (content, assets, search, etc.). Each config file bootstraps its store, registers event listeners, and handles all async initialization using top-level await.

## Design Principles

1. **Events are Facts**: Write what happened, not what should happen
2. **Core Only Emits**: Application logic only writes events
3. **Listeners Handle Side Effects**: Separate concerns - database writes, indexing, notifications
4. **Replay Safety**: Any state can be rebuilt by replaying events
5. **Single Responsibility**: Each listener has one job
6. **Idempotent Listeners**: Listeners handle duplicate events gracefully
7. **Pluggable Event Log**: Event log storage is swappable via container (file, Redis, Elasticsearch)
8. **Convention-Based Bootstrapping**: Config files initialize and register their own services, keeping server.ts clean

## Goals

- Implement `/admin/register` route with registration form (no CSS initially)
- Create pluggable event store interface (swappable via container)
- Implement file-based event log driver for development
- Emit `UserRegistered` event on registration POST
- Build listener system to subscribe to events
- Create user listener that writes to persistent user store
- Replace hardcoded admin credentials with user store lookups
- Establish event sourcing patterns for future features

## Non-Goals (Future Considerations)

- Email verification - Phase 2
- User roles beyond admin/non-admin - separate spec
- Password reset flow - separate spec
- Multi-tenant user isolation - separate spec
- Distributed event bus - production evolution
- Event snapshots - performance optimization later

## Architecture

### Convention: Config File Bootstrapping

Each store config file is responsible ONLY for its store:

```typescript
// config/{storeName}.ts

import { StoreImplementation } from '../lib/{storeName}/stores/file';
import { register } from '../src/container';

// Register store in container
// Constructor handles all setup (creates directories, etc.)
register('{storeName}', () => ({
  store: new StoreImplementation(),
}));

console.log(`✅ {StoreName} store registered`);
```

**Event Listeners Registered Separately:**

All event listeners are registered in `config/events.ts` to avoid circular dependencies:

```typescript
// config/events.ts

import { EventStore } from '../lib/events/store';
import { FileEventWriter } from '../lib/events/writers/file';
import { UserListener } from '../lib/listeners/user';
import { register } from '../src/container';

// Create event store
const eventWriter = new FileEventWriter();
const eventStore = new EventStore(eventWriter);

// Register ALL event listeners here
eventStore.subscribe(new UserListener());
// eventStore.subscribe(new ContentListener());
// eventStore.subscribe(new AssetListener());

register('eventStore', () => eventStore);

export function getEventStore() { return eventStore; }
```

**Design Philosophy:**
- **No explicit `.initialize()` calls** - Constructors handle setup
- **Synchronous construction** - File operations use sync APIs (mkdirSync)
- **Store configs independent** - No dependencies between store configs
- **Event listeners centralized** - All registered in `config/events.ts`
- **Import order irrelevant** - Events config can be first or last

**For stores requiring async initialization (databases, APIs):**
```typescript
// Async initialization wrapped in registration
register('database', async () => {
  const db = new DatabaseStore(process.env.DATABASE_URL);
  await db.connect();  // Async work happens in container
  return { store: db };
});
```

**Benefits:**
- No circular dependencies between configs
- Import order doesn't matter (except events must be imported)
- Clear separation: stores register themselves, events register listeners
- Easy to see all event subscriptions in one place

**Example Future Stores:**
- `config/content.ts` - Just registers ContentStore
- `config/assets.ts` - Just registers AssetStore
- `config/search.ts` - Just registers SearchIndex
- `config/events.ts` - Registers EventStore + ALL listeners

### Event Sourcing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Registration Request                     │
│               POST /admin/register {email, password}        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Registration Handler                        │
│  • Validate input (email format, password strength)         │
│  • Check for duplicate email (read-only query)              │
│  • Hash password (argon2)                                   │
│  • Generate user ID                                         │
│  • Emit UserRegistered event                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Event Store                             │
│  • Append event to event log (data/events/YYYY-MM-DD.jsonl) │
│  • Assign event ID and timestamp                            │
│  • Persist to disk (source of truth)                        │
│  • Notify registered listeners                              │
└────────┬───────────────────────────┬────────────────────────┘
         │                           │
         ▼                           ▼
┌──────────────────┐       ┌──────────────────────┐
│  User Listener   │       │  Future Listeners    │
│                  │       │  • Email Listener    │
│  • Subscribe to  │       │  • Audit Listener    │
│    UserRegistered│       │  • Webhook Listener  │
│  • Write user to │       │  • Analytics         │
│    user store    │       └──────────────────────┘
│  • Update email  │
│    index         │
└──────────────────┘
```

### Event Store Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      EventStore                             │
│  (lib/events/store.ts)                                     │
├────────────────────────────────────────────────────────────┤
│  class EventStore {                                         │
│    constructor(writer: EventWriter) // Injected            │
│    emit(event): Promise<void>                              │
│    subscribe(listener): void                               │
│  }                                                          │
│                                                             │
│  interface EventWriter {                                    │
│    write(event: BaseEvent): Promise<void>                  │
│    initialize(): Promise<void>                             │
│  }                                                          │
└────────────────────┬───────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
        ▼ writes to                ▼ notifies
┌─────────────────────┐    ┌──────────────────────┐
│   EventWriter       │    │   Event Listeners    │
│   Implementations   │    │                      │
├─────────────────────┤    ├──────────────────────┤
│ • FileEventWriter   │    │ Each listener has    │
│ • RedisEventWriter  │    │ its own event reader │
│ • D1EventWriter     │    │ implementation       │
└─────────────────────┘    └──────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ UserListener │ │ImageListener │ │AuditListener │
            │              │ │              │ │              │
            │ Reads from:  │ │ Reads from:  │ │ Reads from:  │
            │ File watcher │ │ S3 events    │ │ Redis Stream │
            └──────────────┘ └──────────────┘ └──────────────┘
```

**Key Design Decision**: 
- **EventStore** uses an **EventWriter** to persist events (write-only)
- **Listeners** each implement their own event reading mechanism
- This allows different listeners to consume events from different sources
- Example: UserListener watches filesystem, ImageListener watches S3 bucket
```

### Listener Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   EventListener Interface                   │
│  (lib/events/types.ts)                                     │
├────────────────────────────────────────────────────────────┤
│  interface EventListener<T extends BaseEvent = BaseEvent> {│
│    subscribesTo: readonly string[];                        │
│    handle(event: T): Promise<void>;                        │
│  }                                                          │
└────────────────────────────────────────────────────────────┘

                           ▼ implements

┌────────────────────────────────────────────────────────────┐
│                      User Listener                          │
│  (lib/listeners/user.ts)                                   │
├────────────────────────────────────────────────────────────┤
│  class UserListener implements EventListener {             │
│    subscribesTo = ['user.registered'] as const;           │
│                                                             │
│    async handle(event: UserRegisteredEvent) {              │
│      // Write to user store                                │
│      await this.userStore.create({                         │
│        id: event.data.userId,                              │
│        email: event.data.email,                            │
│        passwordHash: event.data.passwordHash,              │
│        createdAt: event.timestamp                          │
│      });                                                    │
│    }                                                        │
│  }                                                          │
└────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Event Type Definitions (lib/events/types.ts)

Core event interfaces following CLAUDE.md architecture:

```typescript
// lib/events/types.ts

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
```

### 2. Event Store (lib/events/store.ts)

Core event store with pluggable writer:

```typescript
// lib/events/store.ts

import type { BaseEvent, EventListener, EventWriter } from './types';

/**
 * Event store
 * 
 * Responsibilities:
 * - Manage event listeners (subscribe/notify)
 * - Assign event IDs and timestamps
 * - Delegate persistence to EventWriter implementation
 * 
 * The EventWriter is write-only. Listeners implement their own
 * reading mechanisms (file watchers, S3 events, Redis streams, etc.)
 * 
 * The EventWriter backend is injected via constructor (from config)
 */
export class EventStore {
  private listeners: EventListener[] = [];
  private writer: EventWriter;

  constructor(writer: EventWriter) {
    this.writer = writer;
  }

  /**
   * Register an event listener
   * 
   * NOTE: The EventStore notifies listeners synchronously after writing.
   * Listeners may also implement their own async reading mechanisms
   * (polling, watching, streaming, etc.)
   */
  subscribe(listener: EventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Emit an event
   * 
   * 1. Assigns ID and timestamp if not present
   * 2. Persists to event writer (source of truth)
   * 3. Notifies listeners synchronously (non-blocking)
   * 
   * @throws Error if event persistence fails
   */
  async emit(event: BaseEvent): Promise<void> {
    // Ensure event has ID and timestamp
    const completeEvent: BaseEvent = {
      ...event,
      id: event.id || this.generateEventId(),
      timestamp: event.timestamp || Date.now(),
    };

    // Persist to event writer (source of truth)
    await this.writer.write(completeEvent);

    // Notify listeners synchronously (async, failures don't block)
    // Use Promise.allSettled so one listener failure doesn't affect others
    const promises = this.listeners
      .filter(listener => listener.subscribesTo.includes(event.type))
      .map(listener => listener.handle(completeEvent).catch(error => {
        // Log listener errors but don't fail the event emission
        console.error(`Listener error for ${event.type}:`, error);
      }));

    await Promise.allSettled(promises);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  }
}
```

### 3. File-based Event Writer (lib/events/writers/file.ts)

Development implementation using filesystem:

```typescript
// lib/events/writers/file.ts

import { appendFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { BaseEvent, EventWriter } from '../types';

/**
 * File-based event writer (development)
 * 
 * Structure:
 * data/events/
 *   ├── 2025-12-10.jsonl  ← Today's events (append-only)
 *   ├── 2025-12-09.jsonl
 *   └── 2025-12-08.jsonl
 * 
 * Format: JSON Lines (one event per line)
 * Each line is a complete JSON event object
 * 
 * WARNING: NOT suitable for production
 * - No transactions
 * - No locking (race conditions possible on high concurrency)
 * - File I/O overhead
 * 
 * Use Redis Streams or D1 for production.
 */
export class FileEventWriter implements EventWriter {
  private eventsDir: string;

  constructor(eventsDir: string = 'data/events') {
    this.eventsDir = eventsDir;
    
    // Create events directory if it doesn't exist
    // Use sync API - simple file operations don't need async
    if (!existsSync(this.eventsDir)) {
      mkdirSync(this.eventsDir, { recursive: true });
    }
  }

  async write(event: BaseEvent): Promise<void> {
    const date = new Date(event.timestamp);
    const filename = this.getLogFilename(date);
    const line = JSON.stringify(event) + '\n';

    await appendFile(filename, line, 'utf-8');
  }

  /**
   * Get log filename for a date
   */
  private getLogFilename(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return join(this.eventsDir, `${year}-${month}-${day}.jsonl`);
  }
}
```

### 4. Event Store Configuration (config/events.ts)

Event store and ALL event listeners registered here:

```typescript
// config/events.ts

import { FileEventWriter } from '../lib/events/writers/file';
import { EventStore } from '../lib/events/store';
import { UserListener } from '../lib/listeners/user';
import { register } from '../src/container';

/**
 * Event store configuration
 * 
 * This file:
 * 1. Creates and registers the event store
 * 2. Registers ALL event listeners (centralizes subscriptions)
 * 
 * This avoids circular dependencies between store configs.
 * Store configs (users.ts, content.ts, etc.) only register their stores.
 * 
 * Change this file to configure event writer backend.
 * Default: File-based storage for local development.
 */

// Create event writer (constructor creates directories)
const eventWriter = new FileEventWriter();

// Production examples (uncomment and configure as needed):
// import { RedisEventWriter } from '../lib/events/writers/redis';
// import Redis from 'ioredis';
//
// const eventWriter = process.env.NODE_ENV === 'production'
//   ? new RedisEventWriter(new Redis(process.env.REDIS_URL!))
//   : new FileEventWriter();

// Create event store
const eventStore = new EventStore(eventWriter);

// Register ALL event listeners here (centralized)
eventStore.subscribe(new UserListener());

// Future listeners:
// eventStore.subscribe(new ContentListener());
// eventStore.subscribe(new AssetListener());
// eventStore.subscribe(new SearchListener());

// Register in container
register('eventStore', () => eventStore);

// Export for handler access
export function getEventStore() {
  return eventStore;
}

console.log(`📝 Event store registered: ${eventWriter.constructor.name}`);
console.log(`🎧 Listeners registered: UserListener`);
```

Define user storage interface (pluggable via container):

```typescript
// lib/users/types.ts

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

/**
 * User store interface
 * Implement this for different storage backends (file, D1, KV)
 */
export interface UserStore {
  create(user: User): Promise<void>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  exists(email: string): Promise<boolean>;
}

export interface UserConfig {
  store: UserStore;
}
```

### 4. File-based User Store (lib/users/stores/file.ts)

Development implementation:

```typescript
// lib/users/stores/file.ts

import { writeFile, readFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { User, UserStore } from '../types';

/**
 * File-based user store (development)
 * 
 * Structure:
 * data/users/
 *   ├── by-id/
 *   │   └── user_abc123.json
 *   └── by-email/
 *       └── admin@example.com.json → ../by-id/user_abc123.json
 * 
 * WARNING: NOT suitable for production
 * - No transactions
 * - No locking (race conditions possible)
 * - File I/O overhead
 * 
 * Use D1 for production.
 */
export class FileUserStore implements UserStore {
  private dataDir: string;

  constructor(dataDir: string = 'data/users') {
    this.dataDir = dataDir;
    
    // Create directory structure in constructor
    const dirs = [
      this.dataDir,
      join(this.dataDir, 'by-id'),
      join(this.dataDir, 'by-email'),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  async create(user: User): Promise<void> {
    // Write user by ID
    const idPath = join(this.dataDir, 'by-id', `${user.id}.json`);
    await writeFile(idPath, JSON.stringify(user, null, 2), 'utf-8');

    // Write email index (points to same data)
    const emailPath = join(this.dataDir, 'by-email', `${user.email}.json`);
    await writeFile(emailPath, JSON.stringify(user, null, 2), 'utf-8');
  }

  async findByEmail(email: string): Promise<User | null> {
    const emailPath = join(this.dataDir, 'by-email', `${email}.json`);
    
    if (!existsSync(emailPath)) {
      return null;
    }

    const content = await readFile(emailPath, 'utf-8');
    return JSON.parse(content) as User;
  }

  async findById(id: string): Promise<User | null> {
    const idPath = join(this.dataDir, 'by-id', `${id}.json`);
    
    if (!existsSync(idPath)) {
      return null;
    }

    const content = await readFile(idPath, 'utf-8');
    return JSON.parse(content) as User;
  }

  async exists(email: string): Promise<boolean> {
    const emailPath = join(this.dataDir, 'by-email', `${email}.json`);
    return existsSync(emailPath);
  }
}
```

### 5. User Listener (lib/listeners/user.ts)

Event listener that writes users to store:

```typescript
// lib/listeners/user.ts

import type { EventListener } from '../events/types';
import type { UserRegisteredEvent } from '../events/types';
import { resolve } from '../../src/container';
import type { UserConfig } from '../users/types';

/**
 * User listener
 * 
 * Subscribes to user events and maintains user store.
 * 
 * EVENT READING STRATEGY:
 * This listener is notified synchronously by the EventStore when events
 * are emitted. This is the simplest approach for development.
 * 
 * In production, this listener could implement its own event reading mechanism:
 * - File watcher: Poll/watch data/events/ directory for new JSONL entries
 * - Redis consumer: Subscribe to Redis Stream as a consumer group
 * - Database polling: Query events table for new events periodically
 * 
 * The key is that each listener decides HOW it reads events based on
 * the event source it's configured to use.
 */
export class UserListener implements EventListener<UserRegisteredEvent> {
  subscribesTo = ['user.registered'] as const;

  /**
   * Handle UserRegistered event
   * Write user to persistent store
   */
  async handle(event: UserRegisteredEvent): Promise<void> {
    const { store } = resolve<UserConfig>('users');

    // Check if user already exists (idempotency)
    const existing = await store.findById(event.data.userId);
    if (existing) {
      // Already processed this event
      console.log(`User ${event.data.userId} already exists, skipping`);
      return;
    }

    // Create user in store
    await store.create({
      id: event.data.userId,
      email: event.data.email,
      passwordHash: event.data.passwordHash,
      createdAt: event.data.createdAt,
    });

    console.log(`✓ User registered: ${event.data.email}`);
  }
}
```

**Design Note**: For this spec, the UserListener receives events synchronously via `EventStore.subscribe()`. In production, you could extend this listener to also implement a file watcher, Redis consumer, or other async reading mechanism.

### 6. Registration Handler (lib/admin/handlers/register.tsx)

GET handler for registration form:

```typescript
// lib/admin/handlers/register.tsx

import type { RequestContext } from '../../router/types';
import { ui } from '../../router/react/response';
import { RegistrationForm } from '../ui/RegistrationForm';

/**
 * GET /admin/register
 * Show registration form
 * Layout automatically used from request context (set by withLayout middleware)
 */
export default function register(request: Request, context: RequestContext): Promise<Response> {
  const error = context.query.get('error');
  
  return ui(<RegistrationForm error={error} />);
}
```

### 7. Registration Form Component (lib/admin/ui/RegistrationForm.tsx)

React component (no CSS):

```typescript
// lib/admin/ui/RegistrationForm.tsx

import { Helmet } from 'react-helmet-async';

interface RegistrationFormProps {
  error?: string | null;
}

export function RegistrationForm({ error }: RegistrationFormProps) {
  return (
    <>
      <Helmet>
        <title>Register - Project Conduit</title>
      </Helmet>
      
      <div>
        <header>
          <h1>Create Admin Account</h1>
          <p>Register a new administrator</p>
        </header>
        
        {error && (
          <div role="alert">
            {decodeURIComponent(error)}
          </div>
        )}
        
        <form method="POST" action="/admin/register">
          <div>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <small>Minimum 8 characters</small>
          </div>
          
          <div>
            <label htmlFor="passwordConfirm">Confirm Password</label>
            <input
              type="password"
              id="passwordConfirm"
              name="passwordConfirm"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          
          <button type="submit">Create Account</button>
        </form>
        
        <footer>
          <p>Already have an account? <a href="/admin/login">Log in</a></p>
        </footer>
      </div>
    </>
  );
}
```

### 8. Registration Processor (lib/admin/handlers/processRegistration.ts)

POST handler that emits event:

```typescript
// lib/admin/handlers/processRegistration.ts

import type { RequestContext } from '../../router/types';
import { redirect } from '../../router/response';
import { resolve } from '../../src/container';
import type { UserConfig } from '../../users/types';
import type { UserRegisteredEvent } from '../../events/types';
import type { EventStore } from '../../events/store';

/**
 * POST /admin/register
 * Process registration and emit UserRegistered event
 * 
 * This handler ONLY validates and emits the event.
 * The UserListener handles writing to the user store.
 */
export default async function processRegistration(
  request: Request,
  context: RequestContext
): Promise<Response> {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const passwordConfirm = formData.get('passwordConfirm')?.toString();

  // Validation
  if (!email || !password || !passwordConfirm) {
    return redirect('/admin/register?error=' + encodeURIComponent('All fields required'));
  }

  if (password !== passwordConfirm) {
    return redirect('/admin/register?error=' + encodeURIComponent('Passwords do not match'));
  }

  if (password.length < 8) {
    return redirect('/admin/register?error=' + encodeURIComponent('Password must be at least 8 characters'));
  }

  // Check if email already exists (read-only query)
  const { store } = resolve<UserConfig>('users');
  const exists = await store.exists(email);
  
  if (exists) {
    return redirect('/admin/register?error=' + encodeURIComponent('Email already registered'));
  }

  // Hash password with argon2
  const passwordHash = await hashPassword(password);

  // Generate user ID
  const userId = `user_${crypto.randomUUID()}`;

  // Emit UserRegistered event
  const eventStore = resolve<EventStore>('eventStore');
  const event: UserRegisteredEvent = {
    id: '', // Will be assigned by event store
    timestamp: 0, // Will be assigned by event store
    type: 'user.registered',
    data: {
      userId,
      email,
      passwordHash,
      createdAt: Date.now(),
    },
  };

  await eventStore.emit(event);

  // Redirect to login
  return redirect('/admin/login?registered=true');
}

/**
 * Hash password with argon2
 */
async function hashPassword(password: string): Promise<string> {
  // Use Bun's built-in argon2 support
  return await Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
  });
}
```

### 9. Update Authentication Handler (lib/admin/handlers/authenticate.ts)

Replace hardcoded credentials with user store lookup:

```typescript
// lib/admin/handlers/authenticate.ts

import type { RequestContext } from '../../router/types';
import { redirect } from '../../router/response';
import { createSession, createSessionCookie } from '../../session';
import { resolve } from '../../src/container';
import type { UserConfig } from '../../users/types';

/**
 * POST /admin/login
 * Authenticate user and create session
 * Uses user store instead of hardcoded credentials
 */
export default async function authenticate(
  request: Request,
  context: RequestContext
): Promise<Response> {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();  // Changed from username
  const password = formData.get('password')?.toString();
  const returnTo = formData.get('return')?.toString() || '/admin/dashboard';
  
  // Validate input
  if (!email || !password) {
    return redirect('/admin/login?error=' + encodeURIComponent('Email and password required'));
  }
  
  // Lookup user in store
  const { store } = resolve<UserConfig>('users');
  const user = await store.findByEmail(email);
  
  if (!user) {
    return redirect('/admin/login?error=' + encodeURIComponent('Invalid credentials'));
  }
  
  // Verify password
  const valid = await Bun.password.verify(password, user.passwordHash);
  
  if (!valid) {
    return redirect('/admin/login?error=' + encodeURIComponent('Invalid credentials'));
  }
  
  // Create session (use user ID instead of email)
  const session = await createSession(user.id);
  
  // Set cookie and redirect
  const response = redirect(returnTo);
  response.headers.append('Set-Cookie', createSessionCookie(session));
  
  return response;
}
```

### 10. Update Login Form (lib/admin/ui/LoginForm.tsx)

Change username field to email:

```typescript
// lib/admin/ui/LoginForm.tsx

// ... (keep existing imports and interface) ...

export function LoginForm({ error, returnTo }: LoginFormProps) {
  return (
    <>
      <Helmet>
        <title>Admin Login - Project Conduit</title>
      </Helmet>
      
      <div>
        <header>
          <h1>Project Conduit</h1>
          <p>Admin Login</p>
        </header>
        
        {error && (
          <div role="alert">
            {decodeURIComponent(error)}
          </div>
        )}
        
        <form method="POST" action="/admin/login">
          <input type="hidden" name="return" value={returnTo || '/admin/dashboard'} />
          
          <div>
            <label htmlFor="email">Email</label>  {/* Changed from Username */}
            <input
              type="email"  {/* Changed from text */}
              id="email"    {/* Changed from username */}
              name="email"  {/* Changed from username */}
              required
              autoFocus
              autoComplete="email"  {/* Changed from username */}
            />
          </div>
          
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </div>
          
          <button type="submit">Log In</button>
        </form>
        
        <footer>
          <p>Don't have an account? <a href="/admin/register">Register</a></p>  {/* New */}
        </footer>
      </div>
    </>
  );
}
```

### 11. User Store Configuration (config/users.ts)

User configuration file - ONLY registers the store:

```typescript
// config/users.ts

import { FileUserStore } from '../lib/users/stores/file';
import { register } from '../src/container';

/**
 * User store configuration
 * 
 * This file ONLY registers the user store.
 * Event listeners are registered in config/events.ts to avoid circular deps.
 * 
 * Change this file to configure user storage backend.
 * Default: File-based storage for local development.
 */

// Register user store in container
// Constructor creates directories on instantiation
register('users', () => ({
  store: new FileUserStore(),
}));

// Production example (uncomment and configure as needed):
// import { D1UserStore } from '../lib/users/stores/d1';
//
// register('users', () => ({
//   store: process.env.NODE_ENV === 'production'
//     ? new D1UserStore(env.DB)
//     : new FileUserStore(),
// }));

console.log(`👥 User store registered`);
```

### 12. Update Admin Routes (lib/admin/routes.ts)

Add registration routes:

```typescript
// lib/admin/routes.ts

import type { RouteGroup } from '../router';
import { requireAuth, redirectIfAuth } from '../auth/middleware';
import { withLayout } from '../router/react/middleware';
import { AdminLayout } from './ui/AdminLayout';

export function adminRoutes(group: RouteGroup): void {
  // Apply admin layout to all routes
  group.use(withLayout(AdminLayout));
  
  // Public routes (login and registration)
  group.get('/login', import('./handlers/login'), [redirectIfAuth()]);
  group.post('/login', import('./handlers/authenticate'));
  
  group.get('/register', import('./handlers/register'), [redirectIfAuth()]);  // NEW
  group.post('/register', import('./handlers/processRegistration'));           // NEW
  
  // Logout (POST because it changes state)
  group.post('/logout', import('./handlers/logout'), [requireAuth()]);
  
  // Protected routes
  group.get('/dashboard', import('./handlers/dashboard'), [requireAuth()]);
}
```

### 13. Server Initialization (src/server.ts)

Server remains clean - all initialization happens in config files:

```typescript
// src/server.ts

/**
 * Import config files to register and bootstrap services
 * 
 * ORDER DOESN'T MATTER (except events must be imported):
 * - config/session - Session store (independent)
 * - config/users - User store (independent)
 * - config/events - Event store + ALL listeners (independent)
 * 
 * Each store config file just registers its store in the container.
 * Event listeners are ALL registered in config/events.ts to avoid
 * circular dependencies.
 * 
 * This keeps server.ts clean and establishes a convention
 * for future stores (content, assets, etc.)
 */
import '../config/session';
import '../config/users';   // NEW
import '../config/events';  // NEW - Registers event store + listeners

import { Router } from '../lib/router';
import { createBunServer } from '../lib/adapters/bun';
import { registerRoutes } from './routes';

/**
 * Create and configure the router
 */
const router = new Router();
registerRoutes(router);

/**
 * Start the Bun HTTP server
 */
const server = createBunServer(router, {
  port: Number(process.env.PORT) || 3000,
  hostname: process.env.HOSTNAME || '127.0.0.1',
  development: process.env.NODE_ENV !== 'production',
});

console.log(`🚀 Server running at http://${server.hostname}:${server.port}`);
```

## Directory Structure

```
/
├── lib/                           # 📦 VENDOR LIBRARY CODE
│   ├── events/                    # 🆕 Event sourcing core
│   │   ├── types.ts              # Event & EventWriter interfaces
│   │   ├── store.ts              # EventStore (framework code)
│   │   └── writers/              # 🆕 EventWriter implementations (write-only)
│   │       ├── file.ts           # File-based (dev)
│   │       ├── redis.ts          # Redis Streams (future)
│   │       └── d1.ts             # Cloudflare D1 (future)
│   │
│   ├── listeners/                 # 🆕 Event listeners
│   │   └── user.ts               # User listener (reads events, writes to user store)
│   │                             # Each listener implements its own event reading
│   │
│   ├── users/                     # 🆕 User management
│   │   ├── types.ts              # User types and interfaces
│   │   └── stores/
│   │       └── file.ts           # File-based user store (dev)
│   │
│   └── admin/
│       ├── handlers/
│       │   ├── register.tsx      # 🆕 GET registration form
│       │   ├── processRegistration.ts  # 🆕 POST registration (emits event)
│       │   └── authenticate.ts   # 🔧 Use user store instead of hardcoded
│       ├── ui/
│       │   ├── RegistrationForm.tsx  # 🆕 Registration form component
│       │   └── LoginForm.tsx     # 🔧 Change username → email
│       └── routes.ts             # 🔧 Add registration routes
│
├── config/                        # 🏠 USER CONFIGURATION (Bootstrapping)
│   ├── session.ts                # Session store config (no changes)
│   ├── users.ts                  # 🆕 User store registration ONLY
│   │                             #     - Registers UserStore in container
│   │                             #     - No listener registration (avoid circular deps)
│   └── events.ts                 # 🆕 Event store + ALL listeners
│                                 #     - Creates EventWriter
│                                 #     - Creates EventStore
│                                 #     - Registers UserListener (and future listeners)
│                                 #     - Registers in container
│
├── data/                          # 🆕 File-based storage
│   ├── events/                   # 🆕 Event log (JSONL)
│   │   └── 2025-12-10.jsonl
│   └── users/                    # 🆕 User store (JSON)
│       ├── by-id/
│       │   └── user_abc123.json
│       └── by-email/
│           └── admin@example.com.json
│
└── src/
    └── server.ts                 # 🔧 Just imports config files
                                  #     Import order doesn't matter
                                  #     (all configs are independent)
```

**Key Directory Notes:**
- **`lib/`** - Reusable library code (portable to other projects)
- **`config/`** - User configuration files that **bootstrap** services
  - **Store configs** (users.ts, content.ts) - Only register their stores
  - **Events config** (events.ts) - Registers event store AND all listeners
  - This avoids circular dependencies between configs
  - Import order doesn't matter (all independent)
- **`src/server.ts`** - Stays minimal, just imports configs
- **Convention established**: Future stores follow same pattern
  - `config/content.ts` - Registers ContentStore only
  - `config/assets.ts` - Registers AssetStore only
  - `config/events.ts` - Add ContentListener, AssetListener to subscriptions


## Implementation Phases

### Phase 1: Event Infrastructure
- [ ] Create `lib/events/types.ts` with BaseEvent, UserRegisteredEvent, EventListener, and EventWriter interfaces (no initialize method)
- [ ] Create `lib/events/store.ts` with EventStore class
- [ ] Create `lib/events/writers/file.ts` - constructor creates directories with mkdirSync
- [ ] Create `config/events.ts` - creates EventStore, exports getEventStore(), registers in container
- [ ] Import `config/events.ts` in `src/server.ts` (after session, before users)
- [ ] Write tests for event store (emit, persist)
- [ ] Write tests for FileEventWriter

### Phase 2: User Store
- [ ] Create `lib/users/types.ts` with User and UserStore interfaces
- [ ] Create `lib/users/stores/file.ts` - constructor creates directories with mkdirSync
- [ ] Create `config/users.ts` - registers store in container, no explicit initialize
- [ ] Write tests for user store operations

### Phase 3: Event Listener
- [ ] Create `lib/listeners/user.ts` UserListener
- [ ] Register UserListener in `config/events.ts` (centralized listener registration)
- [ ] Ensure `config/events.ts` is imported in `src/server.ts`
- [ ] Test listener receives and processes events
- [ ] Verify idempotency (safe to call handle() multiple times)

### Phase 4: Registration UI
- [ ] Create `lib/admin/ui/RegistrationForm.tsx` (no CSS)
- [ ] Create `lib/admin/handlers/register.tsx` (GET)
- [ ] Create `lib/admin/handlers/processRegistration.ts` (POST - emits event)
- [ ] Add routes to `lib/admin/routes.ts`
- [ ] Test registration flow end-to-end

### Phase 5: Update Authentication
- [ ] Update `lib/admin/handlers/authenticate.ts` to use user store
- [ ] Update `lib/admin/ui/LoginForm.tsx` (username → email)
- [ ] Test login with registered users
- [ ] Remove hardcoded credentials

### Phase 6: Testing & Documentation
- [ ] Write integration tests for registration → login flow
- [ ] Document EventWriter interface for future implementations
- [ ] Document how listeners can implement their own event reading
- [ ] Test idempotent event handling
- [ ] Verify event log format

## Success Criteria

- [ ] `/admin/register` renders registration form (no CSS)
- [ ] Form submission emits `UserRegistered` event to event log
- [ ] Event log is append-only JSONL format
- [ ] UserListener receives event and writes to user store
- [ ] User store is queryable (by email, by ID)
- [ ] `/admin/login` accepts email instead of username
- [ ] Login validates against user store (not hardcoded credentials)
- [ ] Password hashing uses argon2id
- [ ] Events can be replayed to rebuild user state
- [ ] Duplicate event processing is idempotent (no duplicate users)
- [ ] Event store supports multiple listeners without coupling
- [ ] All tests pass
- [ ] Event log files created in `data/events/`
- [ ] User files created in `data/users/`

## Security Considerations

- **Password Hashing**: argon2id with 64 MiB memory cost
- **Email Validation**: Basic format validation (enhance in Phase 2)
- **Password Strength**: Minimum 8 characters (enhance in Phase 2)
- **Event Log Security**: Events contain password hashes (already hashed)
- **File Permissions**: Event and user files should be readable only by server process
- **No Plain Passwords**: Passwords never stored in plain text or in events

## Testing Strategy

### Unit Tests

```typescript
// lib/events/__tests__/store.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EventStore } from '../store';
import { rmSync } from 'fs';

describe('EventStore', () => {
  const testDir = 'data/test-events';
  let store: EventStore;

  beforeEach(async () => {
    store = new EventStore(testDir);
    await store.initialize();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('emits and persists events', async () => {
    const event = {
      id: '',
      timestamp: 0,
      type: 'test.event',
      data: { foo: 'bar' },
    };

    await store.emit(event);

    // Read event log file
    const events = [];
    for await (const e of store.replay()) {
      events.push(e);
    }

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('test.event');
  });

  it('assigns ID and timestamp', async () => {
    const event = {
      id: '',
      timestamp: 0,
      type: 'test.event',
      data: {},
    };

    await store.emit(event);

    const events = [];
    for await (const e of store.replay()) {
      events.push(e);
    }

    expect(events[0].id).toMatch(/^evt_/);
    expect(events[0].timestamp).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// lib/admin/__tests__/registration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Router } from '../../router';
import { container } from '../../../src/container';
import { FileUserStore } from '../../users/stores/file';
import { EventStore, initializeEventStore } from '../../events/store';
import { UserListener } from '../../listeners/user';
import { rmSync } from 'fs';

describe('User registration', () => {
  let router: Router;
  let eventStore: EventStore;

  beforeEach(async () => {
    // Setup container
    container.clear();
    const userStore = new FileUserStore('data/test-users');
    await userStore.initialize();
    container.register('users', () => ({ store: userStore }));

    // Setup event store
    eventStore = initializeEventStore('data/test-events');
    await eventStore.initialize();
    eventStore.subscribe(new UserListener());

    // Setup router
    router = new Router();
    router.group('/admin', adminRoutes);
  });

  afterEach(() => {
    rmSync('data/test-events', { recursive: true, force: true });
    rmSync('data/test-users', { recursive: true, force: true });
  });

  it('registers new user and emits event', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');
    formData.append('passwordConfirm', 'password123');

    const request = new Request('http://localhost:3000/admin/register', {
      method: 'POST',
      body: formData,
    });

    const response = await router.handle(request);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('/admin/login');

    // Verify user was created
    const { store } = container.get('users');
    const user = await store.findByEmail('test@example.com');
    
    expect(user).not.toBeNull();
    expect(user!.email).toBe('test@example.com');
  });

  it('can login with registered user', async () => {
    // First register
    // ... (registration request) ...

    // Then login
    const loginData = new FormData();
    loginData.append('email', 'test@example.com');
    loginData.append('password', 'password123');

    const loginRequest = new Request('http://localhost:3000/admin/login', {
      method: 'POST',
      body: loginData,
    });

    const response = await router.handle(loginRequest);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/admin/dashboard');
    expect(response.headers.get('set-cookie')).toContain('session=');
  });
});
```

## Future Enhancements

### Phase 2 - User Features
- Email verification flow (emit `EmailVerificationRequested` event)
- Password reset via email (emit `PasswordResetRequested` event)
- Email service listener (sends emails on events)
- Stronger password requirements (zxcvbn integration)

### Phase 3 - Advanced Event Reading Patterns

The current implementation uses **synchronous listener callbacks** (`EventStore.subscribe()`). This is simple and works well for development, but in production, listeners can implement their own event reading mechanisms.

#### File Watcher Pattern (for FileEventWriter)

```typescript
// lib/listeners/user-file-watcher.ts

import { watch } from 'fs';
import { readFile } from 'fs/promises';
import type { BaseEvent } from '../events/types';

export class UserFileWatcherListener {
  private eventsDir = 'data/events';
  private processedEvents = new Set<string>();

  async start(): Promise<void> {
    // Watch for new/modified files in events directory
    watch(this.eventsDir, async (eventType, filename) => {
      if (!filename || !filename.endsWith('.jsonl')) return;

      const filePath = join(this.eventsDir, filename);
      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        const event = JSON.parse(line) as BaseEvent;
        
        // Skip already processed events
        if (this.processedEvents.has(event.id)) continue;
        
        // Process new event
        if (event.type === 'user.registered') {
          await this.handle(event);
          this.processedEvents.add(event.id);
        }
      }
    });
  }

  async handle(event: UserRegisteredEvent): Promise<void> {
    // Same handler logic as synchronous version
  }
}
```

**Use Case**: Long-running worker process that watches for new events

#### S3 Event Pattern (for S3EventWriter)

```typescript
// lib/listeners/image-s3-listener.ts

import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';

/**
 * Image listener that watches S3 bucket for image upload events
 * 
 * Setup:
 * 1. S3 bucket configured to send events to SQS queue
 * 2. This listener polls SQS for new S3 events
 * 3. On S3 event, process the uploaded image
 */
export class ImageS3Listener {
  constructor(
    private s3: S3Client,
    private sqs: SQSClient,
    private queueUrl: string
  ) {}

  async start(): Promise<void> {
    // Poll SQS queue for S3 events
    while (true) {
      const messages = await this.sqs.receiveMessage({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // Long polling
      });

      for (const message of messages.Messages || []) {
        const s3Event = JSON.parse(message.Body!);
        
        // Extract event data from S3 event
        const event = this.parseS3Event(s3Event);
        
        if (event.type === 'image.uploaded') {
          await this.handle(event);
        }

        // Delete message from queue
        await this.sqs.deleteMessage({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle!,
        });
      }
    }
  }

  async handle(event: ImageUploadedEvent): Promise<void> {
    // Generate thumbnails, optimize, etc.
  }
}
```

**Use Case**: Distributed system where events come from external source (S3)

#### Redis Stream Consumer Pattern

```typescript
// lib/listeners/audit-redis-consumer.ts

import type { Redis } from 'ioredis';

/**
 * Audit listener that reads from Redis Stream as a consumer group
 * 
 * Benefits:
 * - Multiple instances can share the load (consumer groups)
 * - Automatic acknowledgment tracking
 * - Built-in pending message handling
 */
export class AuditRedisConsumer {
  constructor(
    private redis: Redis,
    private streamKey: string = 'events',
    private groupName: string = 'audit-consumers',
    private consumerName: string = 'audit-1'
  ) {}

  async start(): Promise<void> {
    // Create consumer group (idempotent)
    try {
      await this.redis.xgroup('CREATE', this.streamKey, this.groupName, '0', 'MKSTREAM');
    } catch (err) {
      // Group already exists
    }

    // Consume events
    while (true) {
      const results = await this.redis.xreadgroup(
        'GROUP', this.groupName, this.consumerName,
        'COUNT', 10,
        'BLOCK', 5000,
        'STREAMS', this.streamKey, '>'
      );

      if (!results) continue;

      for (const [stream, messages] of results) {
        for (const [id, fields] of messages) {
          const event = JSON.parse(fields[1]) as BaseEvent;
          
          if (this.subscribesTo.includes(event.type)) {
            await this.handle(event);
            
            // Acknowledge message
            await this.redis.xack(this.streamKey, this.groupName, id);
          }
        }
      }
    }
  }

  async handle(event: BaseEvent): Promise<void> {
    // Write to audit log
  }
}
```

**Use Case**: Production system with multiple worker instances sharing event processing load

### Alternative EventWriter Implementations

#### Redis Streams EventWriter (lib/events/writers/redis.ts)

```typescript
import type { BaseEvent, EventWriter } from '../types';
import type { Redis } from 'ioredis';

export class RedisEventWriter implements EventWriter {
  constructor(
    private redis: Redis,
    private streamKey: string = 'events'
  ) {}

  async initialize(): Promise<void> {
    // Redis Streams don't require setup
  }

  async write(event: BaseEvent): Promise<void> {
    await this.redis.xadd(
      this.streamKey,
      '*',  // Auto-generate ID
      'data', JSON.stringify(event)
    );
  }
}
```

**Benefits:**
- Built-in persistence and replication
- Consumer groups for distributed processing
- Automatic message acknowledgment tracking
- High performance (in-memory with disk snapshots)

#### Cloudflare D1 EventWriter (lib/events/writers/d1.ts)

```typescript
import type { BaseEvent, EventWriter } from '../types';
import type { D1Database } from '@cloudflare/workers-types';

export class D1EventWriter implements EventWriter {
  constructor(private db: D1Database) {}

  async initialize(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    `);
  }

  async write(event: BaseEvent): Promise<void> {
    await this.db.prepare(`
      INSERT INTO events (id, timestamp, type, data)
      VALUES (?, ?, ?, ?)
    `).bind(
      event.id,
      event.timestamp,
      event.type,
      JSON.stringify(event.data)
    ).run();
  }
}
```

**Benefits:**
- Native Cloudflare Workers integration
- SQL query capabilities for debugging
- Built-in indexes for fast lookups
- Zero-latency access from Workers

### Production Migration Path

To switch from file-based to Redis in production, users only need to:

1. **Change `config/events.ts`:**

```typescript
// Development
// import { FileEventWriter } from '../lib/events/writers/file';
// register('eventWriter', () => new FileEventWriter());

// Production with Redis
import { RedisEventWriter } from '../lib/events/writers/redis';
import Redis from 'ioredis';

register('eventWriter', () => 
  new RedisEventWriter(new Redis(process.env.REDIS_URL!))
);
```

2. **Optionally update listeners to use Redis consumers:**

```typescript
// src/server.ts

// Development: Synchronous callbacks
eventStore.subscribe(new UserListener());

// Production: Redis consumer (async polling)
const userConsumer = new UserRedisConsumer(redis);
await userConsumer.start(); // Starts background polling
```

No changes needed in handlers or event emission code! 🎉

### Key Architectural Benefits

1. **Write/Read Separation**: EventWriter is write-only, listeners implement reading
2. **Listener Independence**: Each listener chooses its own event source
3. **Mixed Sources**: UserListener can read from files while ImageListener reads from S3
4. **Gradual Migration**: Can migrate listeners one at a time to production reading strategies
5. **Testability**: Easy to test with synchronous callbacks, deploy with async consumers

## Open Questions

1. **Event Versioning**: How do we handle UserRegisteredEvent v2 with new fields?
   - Proposed: Use semver in event type (user.registered.v2)
2. **Listener Failures**: Should we retry failed listener executions?
   - Synchronous: Log and continue (can restart listener to reprocess)
   - Async consumers: Redis/SQS consumer groups handle retries automatically
3. **Email Uniqueness**: Race condition if two registrations happen simultaneously?
   - File store: Not safe. D1 store: Use unique index
4. **Event Writer vs Listener Reading**: Should listeners always read from the same source as writer?
   - No! This is a key design decision. Listeners can read from different sources:
     - UserListener: Reads via synchronous callbacks (simple, dev-friendly)
     - ImageListener: Reads from S3 events (separate infrastructure)
     - AuditListener: Reads from Redis Stream (production async)
   - This allows mixing strategies and gradual migration
5. **User Deletion**: Should we emit UserDeleted event or just soft-delete?
   - Proposed: Emit event, listeners handle cleanup (GDPR considerations)

## References

- Event Sourcing Pattern - https://martinfowler.com/eaaDev/EventSourcing.html
- CQRS Pattern - https://martinfowler.com/bliki/CQRS.html
- Argon2 Spec - https://www.rfc-editor.org/rfc/rfc9106.html
- JSON Lines Format - https://jsonlines.org/
- Bun Password Hashing - https://bun.sh/docs/api/hashing#password-hashing
- Redis Streams - https://redis.io/docs/data-types/streams/
- Elasticsearch Time Series - https://www.elastic.co/guide/en/elasticsearch/reference/current/tsds.html
- Cloudflare D1 - https://developers.cloudflare.com/d1/

---

**Status**: 🔨 In Progress - Specification Complete, Implementation Pending
**Next Steps**: 
1. Begin Phase 1 implementation (event infrastructure)
2. Create tests for event store
3. Build out user store and listener
4. Implement registration UI and flow

