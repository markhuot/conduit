# Layout System

The React SSR system supports customizable layouts for rendering components within different HTML structures. All head elements are managed via react-helmet-async.

## Default Layout

By default, all components rendered with `ui()` are wrapped in `src/ui/layouts/default.tsx`:

```tsx
import { ui } from '../../lib/router/react/response';
import { Helmet } from 'react-helmet-async';

function Homepage() {
  return (
    <>
      <Helmet>
        <title>My Page</title>
        <meta name="description" content="Welcome" />
      </Helmet>
      <h1>Welcome</h1>
    </>
  );
}

export default async function home(ctx: RequestContext) {
  return ui(<Homepage />);
}
```

**Note:** No need to `await` - just return the Promise directly for better performance.

The default layout provides:
- Complete HTML document structure
- Empty `<head>` tag (populated by react-helmet-async during SSR)
- Component rendered inside a root `<div>`

## Head Management

Use react-helmet-async's `<Helmet>` component in your page components to set head elements:

```tsx
import { Helmet } from 'react-helmet-async';

export function BlogPost() {
  return (
    <>
      <Helmet>
        <title>My Blog Post</title>
        <meta name="description" content="Post description" />
        <meta property="og:title" content="My Blog Post" />
        <link rel="canonical" href="https://example.com/blog/post" />
        <script src="/analytics.js" />
      </Helmet>
      <article>
        <h1>Blog Post Title</h1>
        <p>Content...</p>
      </article>
    </>
  );
}
```

The helmet tags are automatically extracted during SSR and injected into the layout's `<head>`.

## Custom Layouts

You can create custom layouts for different sections of your site:

```tsx
// src/ui/layouts/admin.tsx
export function AdminLayout({ children, rootId = 'root' }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/admin.css" />
      </head>
      <body>
        <aside>Admin Sidebar</aside>
        <main id={rootId}>{children}</main>
      </body>
    </html>
  );
}
```

Use it in a handler:

```tsx
import { ui } from '../../lib/router/react/response';
import { Helmet } from 'react-helmet-async';
import { AdminLayout } from '../ui/layouts/admin';

function Dashboard() {
  return (
    <>
      <Helmet>
        <title>Dashboard</title>
      </Helmet>
      <h1>Dashboard</h1>
    </>
  );
}

export default async function dashboard(ctx: RequestContext) {
  return ui(<Dashboard />, {
    layout: <AdminLayout />
  });
}
```

## Layout Props

### Default Layout Props

- `children` (ReactNode) - The page component to render
- `rootId` (string) - Root element ID (default: 'root')

### Custom Layout Props

Define your own props based on your needs. The only required prop is `children`.

## How It Works

1. When you call `ui(<Component />, options)`:
   - Component is wrapped in `<HelmetProvider>`
   - Layout is loaded (default or custom)
   - Component is passed to layout as `children`
   - Everything is rendered to HTML string
   - Helmet data is extracted and injected into `<head>`

2. The helmet tags from your component override or extend any defaults

3. The result is returned as an HTML Response

## Examples

### Blog Layout

```tsx
export function BlogLayout({ children, rootId = 'root' }) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="/blog.css" />
      </head>
      <body>
        <header>
          <h1>My Blog</h1>
          <nav>{/* blog navigation */}</nav>
        </header>
        <main id={rootId}>{children}</main>
        <aside>
          {/* sidebar */}
        </aside>
      </body>
    </html>
  );
}
```

### Documentation Layout

```tsx
export function DocsLayout({ children, sidebarItems, rootId = 'root' }) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="/docs.css" />
      </head>
      <body>
        <nav className="sidebar">
          {sidebarItems.map(item => <a href={item.href}>{item.title}</a>)}
        </nav>
        <main className="docs-content" id={rootId}>{children}</main>
      </body>
    </html>
  );
}
```

## Best Practices

1. **Leave `<head>` mostly empty** - Let react-helmet-async manage it
2. **Add static assets in layout** - Stylesheets, fonts that apply to all pages
3. **Use Helmet in components** - For page-specific meta tags, titles, etc.
4. **Pass data via props** - Don't fetch data inside layouts
5. **Use TypeScript** - Define clear prop interfaces for type safety
6. **One layout per section** - Create different layouts for blog, admin, docs, etc.
7. **Test layouts** - Ensure they render correctly with different components
