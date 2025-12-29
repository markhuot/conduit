import { renderToString } from 'react-dom/server';
import type { ReactElement, ComponentType } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { getRequestContext } from '../context';
import { readFileSync } from 'fs';
import { join } from 'path';

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
 * Vite manifest entry
 */
interface ViteManifestEntry {
  file: string;
  css?: string[];
  assets?: string[];
  imports?: string[];
}

type ViteManifest = Record<string, ViteManifestEntry>;

let cachedManifest: ViteManifest | null = null;

/**
 * Load Vite manifest in production
 */
function loadViteManifest(): ViteManifest {
  if (process.env.NODE_ENV !== 'production') {
    return {};
  }
  
  // Cache the manifest to avoid reading the file on every request
  if (cachedManifest) {
    return cachedManifest;
  }
  
  try {
    // Vite generates manifest.json in the build output
    const manifestPath = join(process.cwd(), 'public', '.vite', 'manifest.json');
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    cachedManifest = JSON.parse(manifestContent);
    return cachedManifest!;
  } catch (error) {
    console.error('Failed to load Vite manifest:', error);
    return {};
  }
}

/**
 * Get Vite script tags based on environment
 * 
 * @param requestUrl - The URL from the current request to match hostname
 * 
 * IMPORTANT: This function uses the request's hostname (from the Host header),
 * NOT the LISTEN_HOST environment variable. This ensures that:
 * - Request to localhost:3000 → Scripts use localhost:5173
 * - Request to dev.markhuot.com:3000 → Scripts use dev.markhuot.com:5173
 * - Request to 192.168.1.10:3000 → Scripts use 192.168.1.10:5173
 */
function getViteScripts(requestUrl: URL): string {
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    // Development: Inject Vite dev server scripts
    // Use VITE_DEV_SERVER_URL if explicitly set, otherwise construct from request hostname
    let viteUrl: string;
    
    if (process.env.VITE_DEV_SERVER_URL) {
      viteUrl = process.env.VITE_DEV_SERVER_URL;
    } else {
      // Construct Vite URL using the same hostname as the request
      // This comes from the HTTP Host header, NOT from environment variables
      const vitePort = process.env.VITE_PORT || '5173';
      const protocol = requestUrl.protocol; // Use same protocol (http/https)
      const hostname = requestUrl.hostname; // Use same hostname from request
      viteUrl = `${protocol}//${hostname}:${vitePort}`;
    }
    
    return `
    <script type="module" src="${viteUrl}/@vite/client"></script>
    <script type="module" src="${viteUrl}/client.tsx"></script>`;
  } else {
    // Production: Inject built assets from manifest
    const manifest = loadViteManifest();
    const entry = manifest['client.tsx'];
    
    if (!entry) {
      console.warn('Client entry not found in Vite manifest - hydration will not work');
      return '';
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
  let layoutName = 'default';
  
  if (layout) {
    // 1. Explicit layout option
    LayoutComponent = layout;
    // Try to extract name from function
    layoutName = layout.name || 'custom';
  } else if (ctx.layout) {
    // 2. Layout from request context (set by middleware)
    LayoutComponent = ctx.layout;
    layoutName = ctx.layout.name || 'default';
  } else {
    // 3. Default layout
    const defaultLayout = await import('../../../src/ui/layouts/default');
    LayoutComponent = defaultLayout.DefaultLayout;
    layoutName = 'default';
  }
  
  // Extract component name for hydration
  // @ts-ignore - component.type may have a name or displayName
  const componentName = component.type?.displayName || component.type?.name || 'Unknown';
  
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
  
  // Get Vite scripts for hydration (pass request URL for hostname matching)
  const viteScripts = getViteScripts(ctx.url);
  
  const document = `<!DOCTYPE html>
<html ${helmet.htmlAttributes.toString()}>
<head>
  ${helmet.title.toString()}
  ${helmet.meta.toString()}
  ${helmet.link.toString()}
</head>
<body ${helmet.bodyAttributes.toString()}>
  <div id="${rootId}" data-component="${componentName}" data-layout="${layoutName}">${html}</div>
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
