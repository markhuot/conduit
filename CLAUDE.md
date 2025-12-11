# Project Conduit

**Code Name:** Conduit (bridging content to AI agents)

## Project Overview

Project Conduit is an event-sourced content management system designed for LLM-native workflows. The core system is responsible only for emitting events—subscribed services listen to and act on those events to build read models, update databases, trigger workflows, and more.

This architecture decouples intent (events) from implementation (listeners), making the system highly extensible and easy for AI agents to interact with.

### Repository Structure

This repository contains **both the library and a reference implementation**:

- **`lib/`** - Vendor library code (the CMS library itself)
  - This is the reusable, distributable CMS core
  - Event system, store implementations, base listeners, type definitions
  - Should be framework-agnostic and portable
  - Changes here affect all projects using the library

- **Everything else** - User implementation (reference/example project)
  - Project-specific schemas, content, configurations
  - Custom listeners, API routes, deployment configs
  - May vary significantly project-to-project
  - Demonstrates how to use the library in practice

## Core Philosophy

- **Event Sourcing First**: The system records what happened, not current state
- **Single Responsibility**: Core only emits events; listeners handle side effects
- **LLM-First Design**: Events and schemas prioritize ease of use for AI agents
- **Minimal Core, Extensible Listeners**: Keep the event emitter simple; complexity lives in subscribers

## Architecture

### Event Sourcing Model

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Command   │ ──▶ │   Event     │ ──▶ │     Listeners       │
│  (Intent)   │     │   Store     │     │  (Side Effects)     │
└─────────────┘     └─────────────┘     └─────────────────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                    ┌──────────┐       ┌──────────┐       ┌──────────┐
                    │  Schema  │       │  Search  │       │  Cache   │
                    │ Listener │       │ Indexer  │       │ Builder  │
                    └──────────┘       └──────────┘       └──────────┘
```

### Core Concepts

**Events**: Immutable records of something that happened
- `SchemaCreated`, `SchemaUpdated`, `SchemaDeleted`
- `ContentCreated`, `ContentUpdated`, `ContentDeleted`
- `AssetUploaded`, `AssetDeleted`

**Event Store**: Append-only log of all events (source of truth)

**Listeners**: Subscribe to events and perform side effects
- Filesystem Listener → writes events and content projections to disk
- Schema Listener → writes schema definitions to filesystem
- Search Listener → updates search index
- Webhook Listener → notifies external services

### Example Flow: Schema Creation

1. AI agent sends command: "Create content type 'BlogPost' with fields: title, body, publishedAt"
2. Core emits event: `SchemaCreated { type: 'BlogPost', fields: [...] }`
3. Schema Listener receives event → writes schema definition to filesystem
4. Search Listener receives event → updates index mappings
5. Event is persisted to event store

### Example Flow: Content Update

1. User updates blog post title via API
2. Core emits single event: `ContentUpdated { id: 'post-123', delta: { title: 'New Title' } }`
3. **Filesystem Listener** receives event → writes updated content to `/data/content/blog-posts/post-123.json`
4. **Search Listener** receives event → updates search index with new title
5. Event is appended to event log at `/data/events/2025-12-08.jsonl`

Both listeners work independently—if search indexing fails, the filesystem still has the update, and the event can be replayed to retry indexing.

## Technology Stack

### Runtime & Language
- **Local Development**: Bun (JavaScript runtime)
- **Language**: TypeScript (strict mode)
- **Production**: Cloudflare Workers/Pages

### Core Requirements
- Append-only event store (file-based for dev, D1/KV for production)
- Simple pub/sub mechanism for listeners
- Type-safe event definitions
- Replayable event history

### TypeScript Event Architecture

**Event Type System**: Uses discriminated unions for type safety with extensibility for third-party events.

```typescript
// Base event interface - minimal contract all events must satisfy
interface BaseEvent {
  id: string;           // Unique event ID
  timestamp: number;    // When it happened
  type: string;         // Event type discriminator
  data: unknown;        // Event payload
}

// Core event types use discriminated unions
interface SchemaCreatedEvent extends BaseEvent {
  type: 'schema.created';
  data: {
    schemaId: string;
    name: string;
    fields: FieldDefinition[];
  };
}

interface ContentUpdatedEvent extends BaseEvent {
  type: 'content.updated';
  data: {
    contentId: string;
    schemaId: string;
    delta: Record<string, unknown>;
  };
}

// Union of core events (non-exhaustive for extensibility)
type CoreEvent = 
  | SchemaCreatedEvent
  | ContentUpdatedEvent
  | ContentCreatedEvent
  | SchemaDeletedEvent;
```

**Listener Interface**: Generic design allows third-party events without modifying core.

```typescript
interface EventListener<T extends BaseEvent = BaseEvent> {
  // Event types this listener handles (string array for flexibility)
  subscribesTo: readonly string[];
  
  // Handle method receives typed events
  handle(event: T): Promise<void>;
}

// Example: Filesystem listener for core events
class FilesystemListener implements EventListener<CoreEvent> {
  subscribesTo = ['content.created', 'content.updated', 'content.deleted'] as const;
  
  async handle(event: CoreEvent): Promise<void> {
    // TypeScript narrows type based on event.type
    if (event.type === 'content.updated') {
      await this.writeContentFile(event.data.contentId, event.data.delta);
    }
  }
}

// Third-party listeners work seamlessly
interface CustomEvent extends BaseEvent {
  type: 'custom.thing';
  data: { customField: string };
}

class CustomListener implements EventListener<CustomEvent> {
  subscribesTo = ['custom.thing'] as const;
  
  async handle(event: CustomEvent): Promise<void> {
    // Fully typed for custom events
    console.log(event.data.customField);
  }
}
```

**Event Store**: Accepts any BaseEvent, enabling extensibility without coupling.

```typescript
class EventStore {
  private listeners: EventListener[] = [];
  
  register(listener: EventListener): void {
    this.listeners.push(listener);
  }
  
  async emit(event: BaseEvent): Promise<void> {
    // Persist first (source of truth)
    await this.persist(event);
    
    // Notify interested listeners
    const promises = this.listeners
      .filter(listener => listener.subscribesTo.includes(event.type))
      .map(listener => listener.handle(event));
    
    // Use allSettled - one listener failure doesn't affect others
    await Promise.allSettled(promises);
  }
}
```

**Key Benefits**:
- Core events get full type safety via discriminated unions
- Third-parties can add events without modifying core types
- Each listener defines its own event type constraints
- Events remain pure data (JSON-serializable for event log)
- No runtime type registry needed

## Project Structure

```
/
├── CLAUDE.md          # This file - project context for AI agents
├── README.md          # Human-facing documentation
├── lib/               # 📦 VENDOR LIBRARY CODE (reusable CMS core)
│   ├── container.ts   # Dependency injection container (singleton pattern)
│   ├── events/        # Core event type definitions
│   ├── store/         # Event store implementations
│   ├── listeners/     # Base listener interfaces & built-in listeners
│   └── types/         # Shared TypeScript types
├── src/               # 🏠 USER IMPLEMENTATION CODE
│   ├── schemas/       # Project-specific content schemas
│   ├── listeners/     # Custom event listeners
│   ├── commands/      # Command handlers (project-specific)
│   └── server/        # API server implementation
├── config/            # Service configuration (registers services in container)
│   ├── events.ts      # Event store and listener registration
│   ├── users.ts       # User store registration
│   └── session.ts     # Session store registration
├── data/              # File-based storage (dev environment)
│   ├── events/        # Append-only event log (JSONL)
│   ├── content/       # Content projections (readable by AI)
│   └── schemas/       # Schema definitions
└── deploy/            # Cloudflare deployment configs (user-specific)
```

**Key Distinction**: 
- `lib/` = portable, reusable library code
- Everything else = project-specific implementation showing library usage

## Development Principles

1. **Events are Facts**: Events describe what happened, never what should happen
2. **Listeners are Independent**: Each listener handles its own concerns
3. **Replay Safety**: Any state can be rebuilt by replaying events
4. **Explicitness over Magic**: Clear event types, no implicit behavior
5. **Agent-Tested**: If an LLM struggles with the pattern, refine it

## Current Status

**Phase**: Architecture Design

Decisions to be made:

- [ ] Event store implementation (file-based vs D1 vs KV)
- [ ] Event serialization format (JSON)
- [ ] Listener registration mechanism
- [ ] Event replay/projection strategy
- [ ] API surface for commands

## Working with This Project

### For AI Agents

When working on this project:
1. Think in events: "What happened?" not "What is the current state?"
2. Keep the core simple—add functionality via listeners
3. Events should be self-describing and include all necessary context
4. Document new event types and listeners here

### Key Considerations

- **Immutable events**: Never modify past events
- **Idempotent listeners**: Listeners should handle duplicate events gracefully
- **Event versioning**: Plan for schema evolution of event types
- **Keep events small**: Include only what's needed to describe what happened

## Open Questions

1. How should we handle event versioning/migration?
2. What's the listener discovery/registration pattern?
3. How do we handle listener failures and retries?
4. What's the authentication model for the command API?
5. How do we support event replay for rebuilding state?

## Future Considerations

- Event snapshots for performance
- Distributed event bus
- Event schema registry
- Time-travel debugging
- Multi-tenant event isolation

---

**Last Updated**: 2025-12-08
**Status**: Architecture redesign - event sourcing
