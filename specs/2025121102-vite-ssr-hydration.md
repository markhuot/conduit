# Vite SSR + Client Hydration Specification

**Spec ID**: 2025121102  
**Created**: 2025-12-11  
**Status**: Draft  
**Phase**: Foundation

## Overview

This spec defines how Vite integrates with Project Conduit's SSR architecture to provide:
1. **Server-side rendering (SSR)** - HTML generated on the server
2. **Client-side hydration** - React takes over on the client for interactivity
3. **Hot Module Replacement (HMR)** - Fast development feedback loop
4. **Production builds** - Optimized client bundles

Currently, Vite is misconfigured for SPA-style client-side rendering. This spec restructures Vite to support SSR-first rendering with full-page hydration.

## Design Principles

1. **SSR-First**: Server generates complete HTML; client hydration is enhancement
2. **Universal Components**: Same React components work on server and client
3. **Development Speed**: HMR for instant feedback during development
4. **Production Optimized**: Minimal client JavaScript, code splitting, tree shaking
5. **Progressive Enhancement**: Pages work without JavaScript, enhance with hydration

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEVELOPMENT MODE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Browser Request                                                  │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────────────┐                                             │
│  │  Bun Server     │  (Port 3000)                                │
│  │  (SSR)          │                                             │
│  └────────┬────────┘                                             │
│           │                                                       │
│           │ 1. renderToString(<Component />)                     │
│           │ 2. Inject Vite dev scripts                           │
│           │    - http://localhost:5173/@vite/client              │
│           │    - http://localhost:5173/client.tsx                │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────────────────────────────────────┐            │
│  │  HTML Response (SSR + Vite Dev Scripts)         │            │
│  │  <!DOCTYPE html>                                 │            │
│  │  <html>                                          │            │
│  │    <head>...</head>                              │            │
│  │    <body>                                        │            │
│  │      <div id="root">                             │            │
│  │        <!-- SSR content here -->                 │            │
│  │      </div>                                      │            │
│  │      <script type="module"                       │            │
│  │        src="http://localhost:5173/@vite/client"> │            │
│  │      </script>                                   │            │
│  │      <script type="module"                       │            │
│  │        src="http://localhost:5173/client.tsx">   │            │
│  │      </script>                                   │            │
│  │    </body>                                       │            │
│  │  </html>                                         │            │
│  └──────────────────────┬──────────────────────────┘            │
│                         │                                         │
│                         ▼                                         │
│                    ┌─────────┐                                   │
│                    │ Browser │                                   │
│                    └────┬────┘                                   │
│                         │                                         │
│                         │ Load scripts from Vite dev server      │
│                         │                                         │
│                         ▼                                         │
│                  ┌────────────────┐                              │
│                  │  Vite Dev      │  (Port 5173)                 │
│                  │  Server        │                              │
│                  │  - HMR         │                              │
│                  │  - Transform   │                              │
│                  └────────────────┘                              │
│                         │                                         │
│                         │ Returns client.tsx + dependencies      │
│                         │                                         │
│                         ▼                                         │
│                  ┌────────────────┐                              │
│                  │  Client        │                              │
│                  │  Hydration     │                              │
│                  │  hydrateRoot() │                              │
│                  └────────────────┘                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION MODE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Browser Request                                                  │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────────────┐                                             │
│  │  Server         │                                             │
│  │  (SSR)          │                                             │
│  └────────┬────────┘                                             │
│           │                                                       │
│           │ 1. renderToString(<Component />)                     │
│           │ 2. Inject production bundle scripts                  │
│           │    - /assets/client-[hash].js                        │
│           │    - /assets/client-[hash].css                       │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────────────────────────────────────┐            │
│  │  HTML Response (SSR + Bundle Scripts)           │            │
│  │  <!DOCTYPE html>                                 │            │
│  │  <html>                                          │            │
│  │    <head>                                        │            │
│  │      <link rel="stylesheet"                      │            │
│  │        href="/assets/client-abc123.css">         │            │
│  │    </head>                                       │            │
│  │    <body>                                        │            │
│  │      <div id="root">                             │            │
│  │        <!-- SSR content here -->                 │            │
│  │      </div>                                      │            │
│  │      <script type="module"                       │            │
│  │        src="/assets/client-abc123.js">           │            │
│  │      </script>                                   │            │
│  │    </body>                                       │            │
│  │  </html>                                         │            │
│  └──────────────────────┬──────────────────────────┘            │
│                         │                                         │
│                         ▼                                         │
│                    ┌─────────┐                                   │
│                    │ Browser │                                   │
│                    └────┬────┘                                   │
│                         │                                         │
│                         │ Load static bundles                     │
│                         │                                         │
│                         ▼                                         │
│                  ┌────────────────┐                              │
│                  │  Static Files  │                              │
│                  │  (CDN/Server)  │                              │
│                  └────────────────┘                              │
│                         │                                         │
│                         ▼                                         │
│                  ┌────────────────┐                              │
│                  │  Client        │                              │
│                  │  Hydration     │                              │
│                  │  hydrateRoot() │                              │
│                  └────────────────┘                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
/
├── vite.config.ts              # Vite configuration for SSR + client builds
├── package.json                # Scripts: dev, dev:server, dev:ui, build
│
├── src/
│   ├── ui/
│   │   ├── client.tsx          # NEW: Client-side hydration entry point
│   │   ├── layouts/            # Server-side layouts (used by both SSR & client)
│   │   │   ├── default.tsx
│   │   │   └── custom.tsx
│   │   └── components/         # Universal components (SSR + client)
│   │       └── Homepage.tsx
│   │
│   ├── handlers/               # Route handlers (use ui() helper)
│   │   └── home.tsx
│   │
│   └── server.ts               # Bun server entry point
│
├── lib/
│   └── router/
│       └── react/
│           ├── response.tsx    # UPDATED: Inject Vite scripts based on env
│           └── middleware.ts
│
└── public/                     # Static assets + production builds
    └── assets/                 # Generated by Vite build
        ├── client-[hash].js
        └── client-[hash].css
```

## Implementation Details

### 1. Client Entry Point (`src/ui/client.tsx`)

**Purpose**: Hydrate the SSR'd HTML on the client side.

```tsx
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

/**
 * Client-side hydration entry point
 * 
 * This runs in the browser after SSR and "hydrates" the static HTML,
 * attaching event listeners and making the page interactive.
 * 
 * The server renders the initial HTML with renderToString(),
 * then this script takes over to enable client-side React features.
 */

// Get the root element that was rendered by the server
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Server must render <div id="root">.');
}

// Get the component name from data attribute set by server
const componentName = rootElement.dataset.component;

if (!componentName) {
  throw new Error('No component specified for hydration. Server must set data-component attribute.');
}

// Dynamically import the component that was rendered on the server
// This ensures we hydrate with the exact same component tree
const components = import.meta.glob('./components/**/*.tsx', { eager: true });
const layouts = import.meta.glob('./layouts/**/*.tsx', { eager: true });

async function hydrate() {
  // Find the component by name
  const componentModule = Object.entries({ ...components, ...layouts }).find(
    ([path]) => path.includes(`/${componentName}.tsx`)
  )?.[1];

  if (!componentModule || !('default' in componentModule)) {
    throw new Error(`Component ${componentName} not found for hydration`);
  }

  const Component = (componentModule as any).default;

  // Hydrate the root element with the same component the server rendered
  hydrateRoot(
    rootElement,
    <StrictMode>
      <Component />
    </StrictMode>
  );
}

hydrate().catch(console.error);
```

**Alternative simpler approach** (if we want to avoid dynamic imports):

```tsx
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

// Import the layout that wraps all pages
// This must match what the server renders
import { DefaultLayout } from './layouts/default';

/**
 * Client-side hydration entry point
 * 
 * Hydrates the server-rendered HTML to make it interactive.
 * The server will pass props via a script tag if needed.
 */

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Get server data if passed (for dynamic props)
const serverData = (window as any).__SERVER_DATA__ || {};

// Hydrate with the same component tree the server rendered
// For now, we hydrate the entire HTML structure including layout
// The server must ensure the layout + component match exactly
hydrateRoot(rootElement, <StrictMode>{/* Children will be hydrated from HTML */}</StrictMode>);
```

**Note**: The exact hydration strategy depends on how we structure components. We'll refine this during implementation.

### 2. Updated SSR Response (`lib/router/react/response.tsx`)

**Changes needed**:
- Detect development vs production mode via `process.env.NODE_ENV`
- In development: Inject Vite dev server script tags
- In production: Inject production bundle script tags from manifest
- Add `data-component` attribute to root div for hydration

```tsx
import { renderToString } from 'react-dom/server';
import type { ReactElement, ComponentType } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { getRequestContext } from '../context';

export interface UiOptions {
  status?: number;
  rootId?: string;
  layout?: ComponentType<{ children: ReactElement }>;
}

/**
 * Get Vite script tags based on environment
 */
function getViteScripts(): string {
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    // Development: Inject Vite dev server scripts
    const viteUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    return `
    <script type="module" src="${viteUrl}/@vite/client"></script>
    <script type="module" src="${viteUrl}/client.tsx"></script>`;
  } else {
    // Production: Inject built assets from manifest
    // The manifest is generated by Vite build and maps entry points to hashed files
    const manifest = loadViteManifest();
    const entry = manifest['client.tsx'];
    
    if (!entry) {
      throw new Error('Client entry not found in Vite manifest');
    }
    
    // Include CSS if present
    const cssTag = entry.css?.map(css => 
      `\n    <link rel="stylesheet" href="/${css}">`
    ).join('') || '';
    
    return `${cssTag}
    <script type="module" src="/${entry.file}"></script>`;
  }
}

/**
 * Load Vite manifest in production
 */
function loadViteManifest(): Record<string, any> {
  if (process.env.NODE_ENV !== 'production') {
    return {};
  }
  
  // In production, Vite generates a manifest.json in the build output
  // This maps entry points to their hashed filenames
  try {
    // This path assumes build output is in public/assets/
    const manifestPath = './public/.vite/manifest.json';
    return require(manifestPath);
  } catch (error) {
    console.error('Failed to load Vite manifest:', error);
    return {};
  }
}

export async function ui(
  component: ReactElement,
  options: UiOptions = {}
): Promise<Response> {
  const ctx = getRequestContext();
  const { status = 200, rootId = 'root', layout } = options;
  
  // Layout priority
  let LayoutComponent: ComponentType<{ children: ReactElement }>;
  
  if (layout) {
    LayoutComponent = layout;
  } else if (ctx.layout) {
    LayoutComponent = ctx.layout;
  } else {
    const defaultLayout = await import('../../../src/ui/layouts/default');
    LayoutComponent = defaultLayout.DefaultLayout;
  }
  
  // Render with layout
  const helmetContext = {};
  
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <LayoutComponent>
        {component}
      </LayoutComponent>
    </HelmetProvider>
  );
  
  const { helmet } = helmetContext as any;
  
  // Get Vite scripts for hydration
  const viteScripts = getViteScripts();
  
  const document = `<!DOCTYPE html>
<html ${helmet.htmlAttributes.toString()}>
<head>
  ${helmet.title.toString()}
  ${helmet.meta.toString()}
  ${helmet.link.toString()}
</head>
<body ${helmet.bodyAttributes.toString()}>
  <div id="${rootId}">${html}</div>
  ${viteScripts}
</body>
</html>`;

  return new Response(document, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
```

### 3. Vite Configuration (`vite.config.ts`)

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Root directory for Vite (where client.tsx lives)
  root: 'src/ui',
  
  // Build configuration
  build: {
    // Output directory relative to project root
    outDir: '../../public',
    emptyOutDir: false, // Don't delete public/index.html or other static files
    
    // Generate manifest for SSR script injection
    manifest: true,
    
    // Client bundle configuration
    rollupOptions: {
      input: {
        client: '/client.tsx', // Entry point (relative to root)
      },
      output: {
        // Output to public/assets/
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    sourcemap: true,
  },
  
  // Development server configuration
  server: {
    host: process.env.HOSTNAME || '127.0.0.1',
    port: 5173,
    strictPort: true,
    
    // Important: Allow CORS for dev server requests from backend
    cors: true,
    
    // HMR configuration
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  
  // Base path for assets (relative to domain root)
  base: '/',
});
```

### 4. Package.json Scripts

```json
{
  "scripts": {
    "dev": "bun run dev:server & bun run dev:ui",
    "dev:server": "NODE_ENV=development bun --hot src/server.ts",
    "dev:ui": "vite",
    "dev:network": "HOSTNAME=0.0.0.0 bun run dev",
    "build": "vite build",
    "build:check": "tsc --noEmit && vite build"
  }
}
```

### 5. Environment Variables

**Server Binding**:
- `LISTEN_HOST` - (Optional) Network interface to bind servers to
  - `127.0.0.1` = Localhost only (default for local development)
  - `0.0.0.0` = All network interfaces (for remote/network access)
  - This is NOT the public hostname - that comes from the HTTP Host header
  - Both backend and Vite use this variable

**Development Mode**:
- `NODE_ENV=development` - Enables Vite dev server script injection
- `VITE_DEV_SERVER_URL` - (Optional) Explicit Vite dev server URL override
  - If not set, automatically uses the same hostname as the incoming request
  - Example: `VITE_DEV_SERVER_URL=http://custom-vite.com:5173`
- `VITE_PORT` - (Optional) Vite dev server port (default: 5173)
  - Only used when `VITE_DEV_SERVER_URL` is not set

**Production Mode**:
- `NODE_ENV=production` - Enables production bundle script injection

**Hostname Matching Behavior**:

In development, Vite script tags automatically match the request's hostname (from the HTTP Host header):
- Request to `http://localhost:3000` → Vite scripts at `http://localhost:5173`
- Request to `http://dev.markhuot.com:3000` → Vite scripts at `http://dev.markhuot.com:5173`
- Request to `http://192.168.1.10:3000` → Vite scripts at `http://192.168.1.10:5173`

**Important**: The injected script URLs use the request's hostname, NOT the `LISTEN_HOST` variable. This ensures proper browser connectivity regardless of how the user accesses the application.

**Vite Network Configuration**:

The Vite dev server is configured to accept connections from any hostname:
1. **`server.host`**: Uses `LISTEN_HOST` env var (defaults to `0.0.0.0`) to listen on all network interfaces
2. **`server.allowedHosts: true`**: Disables DNS rebinding protection to allow custom hostnames
3. **CLI flag `--host`**: Ensures Vite listens on all interfaces

This configuration enables development on:
- Remote servers accessed via SSH tunnels
- Custom domains (dev.markhuot.com, staging.example.com, etc.)
- Network-accessible development environments
- Docker containers or VMs

**Example**: Accessing http://dev.markhuot.com:3000 will:
1. Server receives request with Host header: `dev.markhuot.com`
2. Server SSR injects scripts using that hostname: `<script src="http://dev.markhuot.com:5173/client.tsx">`
3. Browser loads script from Vite at: `http://dev.markhuot.com:5173/client.tsx`
4. HMR WebSocket connects to: `ws://dev.markhuot.com:5173`

**Important Distinction**:
- **`LISTEN_HOST`**: Network interface to bind to (`0.0.0.0` or `127.0.0.1`) - server configuration
- **Request hostname**: Comes from HTTP Host header (`dev.markhuot.com`) - used in injected scripts

**Requirements for remote development**:
1. Domain resolves to your server's IP address (DNS or /etc/hosts)
2. Both ports 3000 (backend) and 5173 (Vite) are accessible
3. Firewall/security groups allow connections to both ports
4. Use `LISTEN_HOST=0.0.0.0` environment variable when starting servers

## Development Workflow

1. **Start development servers**:
   ```bash
   bun run dev
   ```
   This starts:
   - Bun server on port 3000 (SSR)
   - Vite dev server on port 5173 (HMR)

2. **Developer makes changes**:
   - Edit `src/ui/components/Homepage.tsx`
   - Vite detects change and sends HMR update
   - Browser updates without full page reload

3. **How it works**:
   - Browser loads page from http://localhost:3000
   - Server renders HTML with SSR
   - HTML includes Vite dev server scripts
   - Browser loads scripts from http://localhost:5173
   - Client hydrates and connects to HMR WebSocket
   - Changes trigger HMR updates

## Production Build Workflow

1. **Build client bundles**:
   ```bash
   bun run build
   ```
   This:
   - Runs Vite build
   - Outputs bundles to `public/assets/`
   - Generates `public/.vite/manifest.json`

2. **Deploy**:
   - Deploy server code (Bun/Node/Cloudflare Worker)
   - Deploy `public/` directory (static assets)
   - Server reads manifest and injects correct script tags

3. **Runtime**:
   - Server renders HTML with SSR
   - HTML includes production bundle scripts
   - Browser loads bundles from CDN or static server
   - Client hydrates the SSR'd HTML

## Component Guidelines

### Universal Components (SSR + Client)

Components should work on both server and client:

```tsx
// src/ui/components/Counter.tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

**SSR behavior**: Renders static HTML with count = 0, button has no handler
**Client behavior**: After hydration, button becomes interactive

### Layout Components

Layouts define the HTML structure and are rendered on the server:

```tsx
// src/ui/layouts/default.tsx
import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

export interface DefaultLayoutProps {
  children: ReactNode;
}

export function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <>
      <Helmet>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Project Conduit</title>
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <a href="/" className="flex items-center">
                  Project Conduit
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </>
  );
}
```

**Note**: Helmet tags are extracted during SSR and placed in `<head>`.

### Handler Usage

Handlers remain unchanged - they use the `ui()` helper:

```tsx
// src/handlers/home.tsx
import type { RequestContext } from '../lib/router';
import { ui } from '../lib/router/react/response';
import { Homepage } from '../ui/components/Homepage';

export default async function handler(ctx: RequestContext) {
  return ui(<Homepage />);
}
```

The `ui()` function handles:
- SSR with `renderToString()`
- Layout resolution
- Script tag injection (dev or prod)
- HTML document generation

## Files to Delete

These files are no longer needed and should be deleted:

- `src/ui/index.html` - Replaced by SSR template in `response.tsx`
- `src/ui/main.tsx` - Replaced by `client.tsx` for hydration
- `src/ui/styles.css` - CSS will be handled by Tailwind (future)
- `public/index.html` - Generated by Vite build, not source file

## Migration Checklist

- [ ] Create `src/ui/client.tsx` (hydration entry point)
- [ ] Update `lib/router/react/response.tsx` (inject Vite scripts)
- [ ] Update `vite.config.ts` (SSR-aware configuration)
- [ ] Update `package.json` scripts
- [ ] Delete old files: `src/ui/index.html`, `src/ui/main.tsx`, `src/ui/styles.css`
- [ ] Test development mode (HMR working)
- [ ] Test production build (bundles generated correctly)
- [ ] Test hydration (client-side interactivity works)
- [ ] Add example interactive component (Counter, etc.)
- [ ] Update documentation

## Future Enhancements

1. **CSS Integration**: Add Tailwind CSS support with Vite
2. **Code Splitting**: Implement route-based code splitting
3. **Island Architecture**: Selective hydration for performance
4. **Streaming SSR**: Use `renderToPipeableStream()` for faster TTFB
5. **React Server Components**: Explore RSC integration
6. **Edge Rendering**: Deploy SSR to Cloudflare Workers
7. **Static Site Generation**: Pre-render static pages at build time

## Open Questions

1. How should we handle server data passing to hydrated components? (e.g., `window.__SERVER_DATA__`)
2. Should we implement selective hydration or always hydrate the full page?
3. How do we want to handle CSS? Inline critical CSS? Separate stylesheet?
4. Should we implement a manifest reader helper or inline it in response.tsx?
5. What's the strategy for handling environment variables in client code?

## References

- [Vite SSR Guide](https://vitejs.dev/guide/ssr.html)
- [React 18 Hydration](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Vite Manifest](https://vitejs.dev/guide/backend-integration.html)

---

**Status**: Ready for implementation
**Next Steps**: Review spec, implement changes, test in development and production modes
