# Project Conduit

Event-sourced CMS for LLM-native workflows

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime installed

### Install Dependencies

```bash
bun install
```

### Development Mode

**Option 1: Backend Only**
```bash
bun run dev
```

**Option 2: Frontend Only**
```bash
bun run dev:ui
```

**Option 3: Full Stack (Backend + Frontend)**
```bash
# Terminal 1 - Backend
bun run dev

# Terminal 2 - Frontend  
bun run dev:ui
```

- Backend runs at `http://localhost:3000` with hot reloading
- Frontend runs at `http://localhost:5173` with Vite dev server
- Frontend proxies `/api` requests to backend

### Production Mode

```bash
# Build everything
bun run build

# Start production server
bun run start
```

Server runs at `http://localhost:3000` and serves both the API and static frontend.

### Type Check

```bash
bun run typecheck
```

## Project Structure

```
/
├── lib/                  # Reusable CMS library code
│   ├── router/           # Core routing system
│   │   ├── index.ts          # Router class
│   │   ├── types.ts          # Type definitions
│   │   └── response.ts       # Response helpers
│   ├── adapters/         # Runtime adapters
│   │   └── bun.ts            # Bun HTTP server adapter
│   └── utils/            # Shared utilities
│       └── static.ts         # Static file serving
├── src/                  # Application implementation
│   ├── server.ts             # Server entry point
│   ├── routes.ts             # Route registration
│   ├── handlers/             # Route handlers
│   │   └── home.ts           # API info handler
│   ├── middleware/           # Middleware functions
│   │   ├── cors.ts           # CORS middleware
│   │   ├── logging.ts        # Request logging
│   │   └── static.ts         # Static file serving
│   └── ui/                   # Frontend React application
│       ├── index.html        # HTML template
│       ├── main.tsx          # React entry point
│       ├── styles.css        # Global styles
│       └── components/       # React components
│           ├── Homepage.tsx  # Homepage component
│           └── Homepage.css  # Homepage styles
├── specs/                # Architecture specifications
│   └── 2025120801-routing.md
├── dist/                 # Production build output
│   ├── public/           # Frontend static files
│   └── server.js         # Backend bundle (future)
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies
```

## Features

### Backend

#### Router
- **Pattern Matching**: Support for named parameters (`/posts/:id`)
- **Dynamic Imports**: Lazy-load handlers for optimal performance
- **Middleware Chains**: Global and route-specific middleware
- **Multiple HTTP Methods**: GET, POST, PUT, PATCH, DELETE

#### Built-in Middleware
- **CORS**: Configurable Cross-Origin Resource Sharing
- **Logging**: Request/response logging with timing
- **Static Files**: Serve static assets and SPA routing

### Frontend

#### React + Vite
- **React 19**: Latest React with TypeScript
- **Vite**: Lightning-fast dev server and build tool
- **Hot Module Replacement**: Instant updates during development
- **Optimized Builds**: Automatic code splitting and minification

#### Homepage Component
- **API Integration**: Fetches backend info via REST API
- **Modern UI**: Clean, responsive design with gradient background
- **Feature Showcase**: Displays project capabilities
- **Error Handling**: Graceful loading and error states

### Example Usage

```typescript
import { Router } from '../lib/router';

const router = new Router();

// Direct handler
router.get('/', async (ctx) => {
  return json({ message: 'Hello!' });
});

// Dynamic import
router.get('/posts/:id', import('./handlers/posts/show'));

// With middleware
router.post('/posts', import('./handlers/posts/create'), [
  authMiddleware,
  validateMiddleware,
]);
```

### Response Helpers

```typescript
import { json, error, notFound } from '../lib/router/response';

// JSON response
return json({ data: 'value' }, { status: 200 });

// Error response
return error('Something went wrong', { status: 500 });

// 404 response
return notFound('Page not found');
```

### Built-in Middleware

**CORS**: Handles Cross-Origin Resource Sharing
```typescript
import { cors } from './middleware/cors';

router.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

**Logging**: Request/response logging
```typescript
import { simpleLogger } from './middleware/logging';

router.use(simpleLogger());
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOSTNAME` - Server hostname (default: localhost)
- `NODE_ENV` - Environment mode (development/production)

## Testing

### Backend API
```bash
# Start backend server
bun run dev

# Test API info endpoint
curl http://localhost:3000/api/info

# Test 404
curl http://localhost:3000/nonexistent
```

### Frontend
```bash
# Start frontend dev server
bun run dev:ui

# Visit in browser
open http://localhost:5173
```

### Production Build
```bash
# Build everything
bun run build

# Start production server
bun run start

# Visit in browser
open http://localhost:3000
```

## Architecture

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation and [specs/2025120801-routing.md](./specs/2025120801-routing.md) for routing specification.

## Current Status

**Phase**: Phase 1, 2 & 3 Complete ✓

### Backend (Phase 1 & 2)
- [x] Core router with pattern matching
- [x] Dynamic import support
- [x] Response helpers
- [x] Bun adapter
- [x] API routes
- [x] CORS middleware
- [x] Logging middleware
- [x] Static file serving

### Frontend (Phase 3)
- [x] Vite configuration
- [x] React 19 with TypeScript
- [x] Homepage component
- [x] API integration
- [x] Production builds
- [x] SPA routing support

**Next Steps**:

- Phase 4: CLI commands & Cloudflare Workers adapter
- Event sourcing system implementation

## License

MIT
