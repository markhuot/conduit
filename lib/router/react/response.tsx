/**
 * React-specific response utilities
 * 
 * Provides server-side rendering (SSR) for React components
 */

import { renderToString } from 'react-dom/server';
import { cloneElement } from 'react';
import type { ReactElement } from 'react';
import { HelmetProvider } from 'react-helmet-async';

/**
 * UI response options
 */
export interface UiOptions {
  /**
   * HTTP status code (default: 200)
   */
  status?: number;
  
  /**
   * Root element ID (default: 'root')
   */
  rootId?: string;
  
  /**
   * Custom layout component (default: src/ui/layouts/default.tsx)
   * The layout receives the page component as children
   */
  layout?: ReactElement;
}

/**
 * Create an HTML response with a server-rendered React component
 * 
 * This function handles:
 * - Server-side rendering of React components
 * - HTML document structure via layout components
 * - Head management via react-helmet-async
 * - Proper Content-Type headers
 * 
 * The component is automatically wrapped in a layout. By default, it uses
 * src/ui/layouts/default.tsx. Use react-helmet-async's <Helmet> component
 * within your page components to set title, meta tags, and other head elements.
 * 
 * Future enhancements:
 * - Streaming SSR support
 * - Client-side hydration scripts
 * - Automatic code splitting
 * 
 * @example
 * ```tsx
 * import { ui } from '../../lib/router/react/response';
 * import { Helmet } from 'react-helmet-async';
 * 
 * // Component with head management
 * function Homepage() {
 *   return (
 *     <>
 *       <Helmet>
 *         <title>Home - My Site</title>
 *         <meta name="description" content="Welcome to our site" />
 *       </Helmet>
 *       <h1>Welcome</h1>
 *     </>
 *   );
 * }
 * 
 * // Handler (no await needed - return Promise directly)
 * export default async function handler(ctx: RequestContext) {
 *   return ui(<Homepage />);
 * }
 * 
 * // With custom layout
 * import { AdminLayout } from '../ui/layouts/admin';
 * 
 * export default async function handler(ctx: RequestContext) {
 *   return ui(<Dashboard />, {
 *     layout: <AdminLayout />
 *   });
 * }
 * ```
 */
export async function ui(
  component: ReactElement,
  options: UiOptions = {}
): Promise<Response> {
  const {
    status = 200,
    rootId = 'root',
    layout,
  } = options;
  
  // Create helmet context for SSR
  const helmetContext = {};
  
  let html: string;
  
  // If custom layout provided, use it
  if (layout) {
    // Wrap layout in HelmetProvider
    const layoutWithProvider = (
      <HelmetProvider context={helmetContext}>
        {cloneElement(layout, { rootId } as any, component)}
      </HelmetProvider>
    );
    html = renderToString(layoutWithProvider);
  } else {
    // Use default layout
    const { DefaultLayout } = await import('../../../src/ui/layouts/default');
    const layoutElement = (
      <HelmetProvider context={helmetContext}>
        <DefaultLayout rootId={rootId}>
          {component}
        </DefaultLayout>
      </HelmetProvider>
    );
    html = renderToString(layoutElement);
  }
  
  // Extract helmet data and inject into head
  const { helmet } = helmetContext as any;
  if (helmet) {
    // Inject helmet tags into the empty <head> tag
    const headContent = [
      helmet.meta.toString(),
      helmet.title.toString(),
      helmet.link.toString(),
      helmet.script.toString(),
    ].filter(Boolean).join('\n');
    
    html = html.replace('<head></head>', `<head>${headContent}</head>`);
  }

  return new Response(`<!DOCTYPE html>\n${html}`, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
