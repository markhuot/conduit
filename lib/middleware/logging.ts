import type { RequestContext, Middleware } from '../router/types';

export interface LoggingOptions {
  /**
   * Log request details (method, URL, params)
   */
  logRequests?: boolean;
  
  /**
   * Log response details (status, duration)
   */
  logResponses?: boolean;
  
  /**
   * Log request/response body (careful with large payloads)
   */
  logBodies?: boolean;
  
  /**
   * Custom logger function
   */
  logger?: (message: string, data?: unknown) => void;
}

/**
 * Logging middleware
 * Logs request/response details for debugging
 */
export function logging(options: LoggingOptions = {}): Middleware {
  const {
    logRequests = true,
    logResponses = true,
    logBodies = false,
    logger = console.log,
  } = options;

  return async (ctx: RequestContext, next) => {
    const startTime = performance.now();
    const { request, params, url } = ctx;

    // Log request
    if (logRequests) {
      const requestData: Record<string, unknown> = {
        method: request.method,
        url: url.pathname + url.search,
        params,
      };

      if (logBodies && request.body) {
        try {
          const clonedRequest = request.clone();
          requestData.body = await clonedRequest.text();
        } catch (err) {
          requestData.body = '<unable to read body>';
        }
      }

      logger('→ Request', requestData);
    }

    // Call next middleware/handler
    const response = await next();

    // Log response
    if (logResponses) {
      const duration = performance.now() - startTime;
      const responseData: Record<string, unknown> = {
        status: response.status,
        duration: `${duration.toFixed(2)}ms`,
      };

      if (logBodies && response.body) {
        try {
          const clonedResponse = response.clone();
          responseData.body = await clonedResponse.text();
        } catch (err) {
          responseData.body = '<unable to read body>';
        }
      }

      logger('← Response', responseData);
    }

    return response;
  };
}

/**
 * Simple request logger that only logs method and URL
 */
export function simpleLogger(): Middleware {
  return async (ctx: RequestContext, next) => {
    const startTime = performance.now();
    const { request, url } = ctx;

    console.log(`${request.method} ${url.pathname}${url.search}`);

    const response = await next();
    const duration = performance.now() - startTime;

    console.log(`  ↳ ${response.status} (${duration.toFixed(2)}ms)`);

    return response;
  };
}
