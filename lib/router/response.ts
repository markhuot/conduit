/**
 * Response helper utilities for common HTTP responses
 * 
 * Framework-agnostic utilities for JSON, errors, redirects, etc.
 * For framework-specific UI rendering, see:
 * - lib/router/react/response.tsx (React SSR)
 * - lib/router/vue/response.ts (Vue SSR - future)
 */

/**
 * Create a JSON response
 */
export function json(
  data: unknown,
  options: {
    status?: number;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, headers = {} } = options;
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create an error response
 */
export function error(
  message: string,
  options: {
    status?: number;
    code?: string;
    details?: unknown;
  } = {}
): Response {
  const { status = 500, code, details } = options;
  
  return json(
    {
      error: {
        message,
        code,
        details,
      },
    },
    { status }
  );
}

/**
 * Create a 404 Not Found response
 */
export function notFound(message = 'Not found'): Response {
  return error(message, { status: 404, code: 'NOT_FOUND' });
}

/**
 * Create a 400 Bad Request response
 */
export function badRequest(message: string, details?: unknown): Response {
  return error(message, { status: 400, code: 'BAD_REQUEST', details });
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorized(message = 'Unauthorized'): Response {
  return error(message, { status: 401, code: 'UNAUTHORIZED' });
}

/**
 * Create a 403 Forbidden response
 */
export function forbidden(message = 'Forbidden'): Response {
  return error(message, { status: 403, code: 'FORBIDDEN' });
}

/**
 * Create a 204 No Content response
 */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Create a redirect response
 */
export function redirect(url: string, status: 301 | 302 | 307 | 308 = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  });
}
