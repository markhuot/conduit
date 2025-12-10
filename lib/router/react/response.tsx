import { renderToString } from 'react-dom/server';
import type { ReactElement, ComponentType } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { getRequestContext } from '../context';

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
   * Custom layout component (explicit override)
   * Overrides any layout set by middleware in request context
   */
  layout?: ComponentType<{ children: ReactElement }>;
}

/**
 * Server-side render a React component to HTML
 * 
 * Layout priority:
 * 1. Explicit layout option passed to ui()
 * 2. Layout from request context (set by middleware via ctx.layout)
 * 3. Default layout from src/ui/layouts/default
 * 
 * The request context is automatically available via AsyncLocalStorage,
 * so handlers don't need to pass it around.
 * 
 * @example
 * ```tsx
 * // Handler - no context parameter needed!
 * export default function handler(ctx: RequestContext) {
 *   return ui(<HomePage />);  // Layout comes from middleware
 * }
 * 
 * // Or override layout explicitly
 * export default function handler(ctx: RequestContext) {
 *   return ui(<SpecialPage />, { layout: CustomLayout });
 * }
 * ```
 */
export async function ui(
  component: ReactElement,
  options: UiOptions = {}
): Promise<Response> {
  const ctx = getRequestContext();  // Get context from AsyncLocalStorage
  const { status = 200, rootId = 'root', layout } = options;
  
  // Layout priority
  let LayoutComponent: ComponentType<{ children: ReactElement }>;
  
  if (layout) {
    // 1. Explicit layout option
    LayoutComponent = layout;
  } else if (ctx.layout) {
    // 2. Layout from request context (set by middleware)
    LayoutComponent = ctx.layout;
  } else {
    // 3. Default layout
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
  
  const document = `<!DOCTYPE html>
<html ${helmet.htmlAttributes.toString()}>
<head>
  ${helmet.title.toString()}
  ${helmet.meta.toString()}
  ${helmet.link.toString()}
</head>
<body ${helmet.bodyAttributes.toString()}>
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
