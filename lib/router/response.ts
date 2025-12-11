/**
 * Response helper utilities for common HTTP responses
 * 
 * Framework-agnostic utilities for JSON responses.
 * For error handling, use error classes from lib/router/errors.ts
 * For framework-specific UI rendering, see:
 * - lib/router/react/response.tsx (React SSR)
 * - lib/router/vue/response.ts (Vue SSR - future)
 */

/**
 * Create a JSON response
 * 
 * @example
 * ```ts
 * // Success response
 * return json({ data: user });
 * 
 * // With custom status
 * return json({ data: post }, { status: 201 });
 * 
 * // With headers
 * return json({ data: result }, { 
 *   headers: { 'X-Custom': 'value' } 
 * });
 * ```
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
 * Create a 204 No Content response
 * 
 * @example
 * ```ts
 * // Delete endpoint
 * await deleteUser(id);
 * return noContent();
 * ```
 */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

