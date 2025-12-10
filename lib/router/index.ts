import type {
  HttpMethod,
  RouteHandler,
  Middleware,
  RouteDefinition,
  RouteMatch,
  RequestContext,
  HandlerImport,
  HandlerModule,
} from './types';
import { notFound, error } from './response';
import { serveStaticFile } from '../utils/static';
import { join } from 'path';
import { runWithContext } from './context';

/**
 * Core Router class
 * 
 * Supports:
 * - Pattern matching with named parameters (/posts/:id)
 * - Dynamic imports for lazy-loaded handlers
 * - Middleware chains
 * - Multiple HTTP methods
 * - Static file serving
 */
export class Router {
  private routes: RouteDefinition[] = [];
  private globalMiddleware: Middleware[] = [];
  private staticDir: string | null = null;

  /**
   * Register global middleware that runs on all routes
   */
  use(middleware: Middleware): this {
    this.globalMiddleware.push(middleware);
    return this;
  }

  /**
   * Register a GET route
   */
  get(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.register('GET', pattern, handler, middleware);
  }

  /**
   * Register a POST route
   */
  post(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.register('POST', pattern, handler, middleware);
  }

  /**
   * Register a PUT route
   */
  put(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.register('PUT', pattern, handler, middleware);
  }

  /**
   * Register a PATCH route
   */
  patch(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.register('PATCH', pattern, handler, middleware);
  }

  /**
   * Register a DELETE route
   */
  delete(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.register('DELETE', pattern, handler, middleware);
  }

  /**
   * Serve static files from a directory
   * Example: router.static('public')
   */
  static(directory: string): this {
    this.staticDir = join(process.cwd(), directory);
    return this;
  }

  /**
   * Register a group of routes with a common prefix and middleware
   * 
   * @example
   * ```ts
   * router.group('/admin', (group) => {
   *   group.get('/dashboard', dashboardHandler);
   *   group.get('/users', usersHandler);
   * }, [authMiddleware]);
   * ```
   */
  group(
    prefix: string,
    callback: (group: RouteGroup) => void,
    middleware: Middleware[] = []
  ): this {
    const group = new RouteGroup(this, prefix, middleware);
    callback(group);
    return this;
  }

  /**
   * Register a route with any HTTP method
   */
  private register(
    method: HttpMethod,
    pattern: string,
    handler: RouteHandler | HandlerImport,
    middleware: Middleware[]
  ): this {
    const { regex, paramNames } = this.compilePattern(pattern);
    
    this.routes.push({
      method,
      pattern,
      handler,
      middleware,
      regex,
      paramNames,
    });

    return this;
  }

  /**
   * Compile a route pattern into a regex with parameter extraction
   * 
   * Examples:
   * - /posts -> /^\/posts$/
   * - /posts/:id -> /^\/posts\/([^/]+)$/ with params: ['id']
   * - /posts/:id/comments/:commentId -> /^\/posts\/([^/]+)\/comments\/([^/]+)$/ with params: ['id', 'commentId']
   */
  private compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    
    // Escape special regex characters except for :param patterns
    let regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/:(\w+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)'; // Match any characters except /
      });

    // Ensure exact match
    regexPattern = `^${regexPattern}$`;

    return {
      regex: new RegExp(regexPattern),
      paramNames,
    };
  }

  /**
   * Match a request against registered routes
   */
  private async match(method: HttpMethod, pathname: string): Promise<RouteMatch | null> {
    for (const route of this.routes) {
      // Check method matches
      if (route.method !== method) {
        continue;
      }

      // Check pattern matches
      const match = route.regex?.exec(pathname);
      if (!match) {
        continue;
      }

      // Extract parameters
      const params: Record<string, string> = {};
      route.paramNames?.forEach((name, index) => {
        const value = match[index + 1];
        if (value !== undefined) {
          params[name] = value;
        }
      });

      // Resolve handler (might be a dynamic import)
      const handler = await this.resolveHandler(route.handler);

      return {
        handler,
        params,
        middleware: route.middleware,
      };
    }

    return null;
  }

  /**
   * Resolve a handler - supports both direct functions and dynamic imports
   */
  private async resolveHandler(
    handlerOrImport: RouteHandler | HandlerImport
  ): Promise<RouteHandler> {
    // If it's a Promise (dynamic import), resolve it
    if (handlerOrImport instanceof Promise) {
      const module = await handlerOrImport;
      const exported = module.default;

      // Handler module can export either:
      // 1. Direct function: export default function handler(ctx) { ... }
      // 2. Object with handler: export default { handler: (ctx) => { ... }, middleware: [...] }
      if (typeof exported === 'function') {
        return exported;
      }

      if (typeof exported === 'object' && exported !== null && 'handler' in exported) {
        return exported.handler;
      }

      throw new Error('Handler module must export a function or object with handler property');
    }

    // Direct function handler
    return handlerOrImport;
  }

  /**
   * Handle an incoming HTTP request
   */
  async handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const method = request.method as HttpMethod;
      const pathname = url.pathname;

      // Build request context
      const ctx: RequestContext = {
        request,
        params: {},
        query: url.searchParams,
        url,
      };

      // Run entire request within async local storage context
      // This makes ctx available to all async operations via getRequestContext()
      return await runWithContext(ctx, async () => {
        // Try to serve static file if static directory is configured
        // Support both GET and HEAD methods for static files
        if (this.staticDir && (method === 'GET' || method === 'HEAD')) {
          const staticResponse = await serveStaticFile(this.staticDir, pathname);
          if (staticResponse) {
            return staticResponse;
          }
        }

        // Match route
        const match = await this.match(method, pathname);
        
        if (!match) {
          // No route match - run global middleware with 404 handler
          const notFoundHandler = (): Response => {
            return notFound(`Route not found: ${method} ${pathname}`);
          };
          
          return await this.executeMiddlewareChain(ctx, this.globalMiddleware, notFoundHandler);
        }

        // Update context with route params
        ctx.params = match.params;

        // Build middleware chain (global + route-specific)
        const middlewareChain = [...this.globalMiddleware, ...match.middleware];

        // Execute middleware chain + handler
        return await this.executeMiddlewareChain(ctx, middlewareChain, match.handler);
      });
      
    } catch (err) {
      console.error('Router error:', err);
      return error(
        err instanceof Error ? err.message : 'Internal server error',
        { status: 500 }
      );
    }
  }

  /**
   * Execute middleware chain and final handler
   */
  private async executeMiddlewareChain(
    ctx: RequestContext,
    middleware: Middleware[],
    handler: RouteHandler
  ): Promise<Response> {
    let index = 0;

    const next = async (): Promise<Response> => {
      // If we've gone through all middleware, call the handler
      if (index >= middleware.length) {
        return await handler(ctx);
      }

      // Get current middleware and increment index
      const currentMiddleware = middleware[index];
      if (!currentMiddleware) {
        // Should not happen, but TypeScript needs this check
        return await handler(ctx);
      }
      index++;

      // Call middleware with next function
      return await currentMiddleware(ctx, next);
    };

    return await next();
  }
}

/**
 * Route group builder
 * Proxies all method calls to router with prefix and middleware
 */
export class RouteGroup {
  private groupMiddleware: Middleware[] = [];
  
  constructor(
    private router: Router,
    private prefix: string,
    private middleware: Middleware[]
  ) {}
  
  /**
   * Add middleware that applies to all routes in this group
   * Called after group-level middleware but before route-specific middleware
   * 
   * @example
   * ```ts
   * router.group('/admin', (group) => {
   *   group.use(withLayout(AdminLayout));
   *   group.use(requireAuth());
   *   group.get('/dashboard', handler);  // Has both middleware
   * });
   * ```
   */
  use(middleware: Middleware): this {
    this.groupMiddleware.push(middleware);
    return this;
  }
  
  /**
   * Proxy any HTTP method to the router with prefix and middleware
   */
  private route(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    pattern: string,
    handler: RouteHandler | HandlerImport,
    additionalMiddleware: Middleware[] = []
  ): this {
    this.router[method](
      this.prefix + pattern,
      handler,
      [...this.middleware, ...this.groupMiddleware, ...additionalMiddleware]
    );
    return this;
  }
  
  get(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.route('get', pattern, handler, middleware);
  }
  
  post(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.route('post', pattern, handler, middleware);
  }
  
  put(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.route('put', pattern, handler, middleware);
  }
  
  patch(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.route('patch', pattern, handler, middleware);
  }
  
  delete(pattern: string, handler: RouteHandler | HandlerImport, middleware: Middleware[] = []): this {
    return this.route('delete', pattern, handler, middleware);
  }
}
