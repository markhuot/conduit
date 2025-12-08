/**
 * Request context passed to handlers and middleware
 */
export interface RequestContext {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  url: URL;
}

/**
 * Route handler function signature
 */
export type RouteHandler = (ctx: RequestContext) => Response | Promise<Response>;

/**
 * Middleware function signature
 * Can modify context, return early response, or call next()
 */
export type Middleware = (
  ctx: RequestContext,
  next: () => Response | Promise<Response>
) => Response | Promise<Response>;

/**
 * HTTP methods supported by the router
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Handler module export formats
 * - Direct function export (default)
 * - Object with handler and optional middleware
 */
export interface HandlerModule {
  default: RouteHandler | {
    handler: RouteHandler;
    middleware?: Middleware[];
  };
}

/**
 * Dynamic import type for lazy-loaded handlers
 */
export type HandlerImport = Promise<HandlerModule>;

/**
 * Route definition - stores pattern, method, and handler
 */
export interface RouteDefinition {
  method: HttpMethod;
  pattern: string;
  handler: RouteHandler | HandlerImport;
  middleware: Middleware[];
  // Compiled regex pattern for matching
  regex?: RegExp;
  // Parameter names extracted from pattern
  paramNames?: string[];
}

/**
 * Result of matching a route against a URL
 */
export interface RouteMatch {
  handler: RouteHandler;
  params: Record<string, string>;
  middleware: Middleware[];
}
