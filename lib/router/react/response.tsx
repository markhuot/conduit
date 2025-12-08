/**
 * React-specific response utilities
 * 
 * Provides server-side rendering (SSR) for React components
 */

import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';

/**
 * UI response options
 */
export interface UiOptions {
  /**
   * Page title (default: 'Project Conduit')
   */
  title?: string;
  
  /**
   * Additional meta tags
   */
  meta?: Record<string, string>;
  
  /**
   * Additional head content (scripts, links, etc.)
   */
  head?: string;
  
  /**
   * Props to pass to the component
   */
  props?: Record<string, unknown>;
  
  /**
   * HTTP status code (default: 200)
   */
  status?: number;
  
  /**
   * Root element ID (default: 'root')
   */
  rootId?: string;
}

/**
 * Create an HTML response with a server-rendered React component
 * 
 * This function handles:
 * - Server-side rendering of React components
 * - HTML document structure generation
 * - Proper Content-Type headers
 * - Customizable page metadata
 * 
 * Future enhancements:
 * - Streaming SSR support
 * - Client-side hydration scripts
 * - Automatic code splitting
 * 
 * @example
 * ```ts
 * import { ui } from '../../lib/router/react/response';
 * 
 * export default async function handler(ctx: RequestContext) {
 *   return ui(<Homepage />, {
 *     title: 'Home',
 *     meta: { description: 'Welcome to our site' }
 *   });
 * }
 * ```
 */
export function ui(
  component: ReactElement,
  options: UiOptions = {}
): Response {
  const {
    title = 'Project Conduit',
    meta = {},
    head = '',
    status = 200,
    rootId = 'root',
  } = options;
  
  // Render the React component to HTML string
  const html = renderToString(component);
  
  // Build meta tags
  const metaTags = Object.entries(meta)
    .map(([name, content]) => `  <meta name="${name}" content="${content}">`)
    .join('\n');
  
  // Wrap in HTML document
  const document = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
${metaTags ? metaTags + '\n' : ''}${head ? head + '\n' : ''}</head>
<body>
  <div id="${rootId}">${html}</div>
</body>
</html>`;

  return new Response(document, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
