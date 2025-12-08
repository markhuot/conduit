import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Static file serving utilities
 */

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

/**
 * Get MIME type from file extension
 */
export function getMimeType(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Serve a static file from the filesystem
 */
export async function serveStaticFile(
  publicDir: string,
  requestPath: string
): Promise<Response | null> {
  try {
    // Remove leading slash and resolve path
    let filePath = requestPath.replace(/^\//, '');
    
    // If path is empty (homepage) or ends with /, don't try to serve as file
    if (filePath === '' || filePath.endsWith('/')) {
      return null;
    }
    
    const fullPath = join(publicDir, filePath);

    // Security check: ensure file is within public directory
    // Need to resolve both paths to handle symlinks properly
    const resolvedPublicDir = join(publicDir, '/');
    if (!fullPath.startsWith(resolvedPublicDir) && !fullPath.startsWith(publicDir)) {
      return null;
    }

    // Check if file exists
    if (!existsSync(fullPath)) {
      return null;
    }

    // Read and serve the file
    const file = Bun.file(fullPath);
    const mimeType = getMimeType(fullPath);

    return new Response(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000', // 1 year for static assets
      },
    });
  } catch (err) {
    console.error('Error serving static file:', err);
    return null;
  }
}

/**
 * Serve index.html for SPA routing (catch-all route)
 */
export async function serveSpaIndex(publicDir: string): Promise<Response | null> {
  try {
    const indexPath = join(publicDir, 'index.html');

    if (!existsSync(indexPath)) {
      return null;
    }

    const file = Bun.file(indexPath);

    return new Response(file, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache', // Don't cache index.html
      },
    });
  } catch (err) {
    console.error('Error serving SPA index:', err);
    return null;
  }
}
