# React Response Utilities

React-specific response helpers for server-side rendering (SSR) with react-helmet-async for head management.

## Basic Usage

```ts
import { ui } from '../../../lib/router/react/response';
import type { RequestContext } from '../../../lib/router/types';
import { Helmet } from 'react-helmet-async';

function MyComponent() {
  return (
    <>
      <Helmet>
        <title>My Page</title>
        <meta name="description" content="Page description" />
        <meta name="keywords" content="react, ssr, conduit" />
        <link rel="stylesheet" href="/custom.css" />
      </Helmet>
      <h1>My Page Content</h1>
    </>
  );
}

export default async function handler(ctx: RequestContext): Promise<Response> {
  return ui(<MyComponent />);
}
```

**Note:** You don't need to `await` the `ui()` call - just return the Promise directly. This allows for better performance and flexibility in the request handling chain.

## Head Management with react-helmet-async

All head elements (title, meta tags, links, scripts) are managed using [react-helmet-async](https://github.com/staylor/react-helmet-async). Simply use the `<Helmet>` component in your page components:

```tsx
import { Helmet } from 'react-helmet-async';

export function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us</title>
        <meta name="description" content="Learn about our company" />
        <meta property="og:title" content="About Us" />
        <meta property="og:description" content="Learn about our company" />
        <link rel="canonical" href="https://example.com/about" />
      </Helmet>
      <h1>About Us</h1>
      <p>Our story...</p>
    </>
  );
}
```

The head elements are automatically extracted during SSR and injected into the layout's `<head>` tag.

## Layout System

By default, components are wrapped in `src/ui/layouts/default.tsx`. You can customize the layout per route:

### Using Default Layout

```ts
// Uses src/ui/layouts/default.tsx automatically
export default async function handler(ctx: RequestContext) {
  return ui(<Homepage />);
}
```

### Using Custom Layout

```ts
import { AdminLayout } from '../ui/layouts/admin';

export default async function handler(ctx: RequestContext) {
  return ui(<Dashboard />, {
    layout: <AdminLayout sidebar="visible" />
  });
}
```

### Creating a Custom Layout

```tsx
// src/ui/layouts/admin.tsx
import type { ReactNode } from 'react';

export function AdminLayout({ 
  children, 
  sidebar,
  rootId = 'root',
}: { 
  children: ReactNode; 
  sidebar?: string;
  rootId?: string;
}) {
  return (
    <html lang="en">
      <head>
        {/* Helmet content will be injected here during SSR */}
        <link rel="stylesheet" href="/admin.css" />
      </head>
      <body>
        {sidebar && <aside className="sidebar">{/* sidebar content */}</aside>}
        <main id={rootId}>{children}</main>
      </body>
    </html>
  );
}
```

**Important:** Leave the `<head>` tag mostly empty - react-helmet-async will populate it during SSR. You can add static assets like stylesheets directly in the head.

See `src/ui/layouts/README.md` for more layout examples and best practices.

## API

### `ui(component, options?)`

Renders a React component to an HTML document response.

**Parameters:**
- `component: ReactElement` - The React component to render
- `options?: UiOptions` - Optional configuration:
  - `status?: number` - HTTP status code (default: 200)
  - `rootId?: string` - Root element ID (default: 'root')
  - `layout?: ReactElement` - Custom layout component (default: src/ui/layouts/default.tsx)

**Returns:** `Promise<Response>` with HTML content and proper headers

## Features

- ✅ Server-side rendering with React
- ✅ Head management with react-helmet-async
- ✅ Custom layouts per route
- ✅ Type-safe with TypeScript
- ✅ Promise-based (no await needed in handlers)

## Future Enhancements

- Streaming SSR support
- Client-side hydration scripts
- Automatic code splitting
- React 18+ features (Suspense, etc.)
