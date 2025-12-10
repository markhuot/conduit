import type { RequestContext, Middleware } from '../router/types';
import { serveStaticFile, serveSpaIndex } from '../utils/static';
import { join } from 'path';

export interface StaticOptions {
  /**
   * Directory to serve files from
   */
  publicDir: string;
  
  /**
   * Enable SPA mode (serve index.html for non-file routes)
   */
  spa?: boolean;
  
  /**
   * Paths to exclude from static serving (e.g., /api/*)
   */
  exclude?: string[];
}

/**
 * Static file serving middleware
 * Serves files from a public directory
 */
export function staticFiles(options: StaticOptions): Middleware {
  const { publicDir, spa = true, exclude = [] } = options;
  const absolutePublicDir = join(process.cwd(), publicDir);

  return async (ctx: RequestContext, next) => {
    const pathname = ctx.url.pathname;

    // Check if path should be excluded (e.g., API routes)
    const isExcluded = exclude.some(pattern => {
      if (pattern.endsWith('*')) {
        return pathname.startsWith(pattern.slice(0, -1));
      }
      return pathname === pattern;
    });

    if (isExcluded) {
      return await next();
    }

    // Try to serve static file
    const staticResponse = await serveStaticFile(absolutePublicDir, pathname);
    if (staticResponse) {
      return staticResponse;
    }

    // If SPA mode and no static file found, serve index.html
    if (spa) {
      const spaResponse = await serveSpaIndex(absolutePublicDir);
      if (spaResponse) {
        return spaResponse;
      }
    }

    // No static file found, continue to next middleware/handler
    return await next();
  };
}
