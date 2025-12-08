# React Response Utilities

React-specific response helpers for server-side rendering (SSR).

## Usage

```ts
import { ui } from '../../../lib/router/react/response';
import type { RequestContext } from '../../../lib/router/types';
import { MyComponent } from '../ui/components/MyComponent';

export default async function handler(ctx: RequestContext): Promise<Response> {
  return ui(<MyComponent />, {
    title: 'My Page',
    meta: {
      description: 'Page description',
      keywords: 'react, ssr, conduit'
    },
    head: '<link rel="stylesheet" href="/custom.css">',
    status: 200,
    rootId: 'root'
  });
}
```

## API

### `ui(component, options?)`

Renders a React component to an HTML document response.

**Parameters:**
- `component: ReactElement` - The React component to render
- `options?: UiOptions` - Optional configuration:
  - `title?: string` - Page title (default: 'Project Conduit')
  - `meta?: Record<string, string>` - Meta tags as key-value pairs
  - `head?: string` - Additional HTML to inject in `<head>`
  - `status?: number` - HTTP status code (default: 200)
  - `rootId?: string` - Root element ID (default: 'root')

**Returns:** `Response` with HTML content and proper headers

## Future Enhancements

- Streaming SSR support
- Client-side hydration scripts
- Automatic code splitting
- React 18+ features (Suspense, etc.)
