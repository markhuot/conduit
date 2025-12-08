import type { RequestContext, Middleware } from '../../lib/router/types';

export interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * CORS middleware
 * Handles Cross-Origin Resource Sharing headers
 */
export function cors(options: CorsOptions = {}): Middleware {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400, // 24 hours
  } = options;

  return async (ctx: RequestContext, next) => {
    const { request } = ctx;
    
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request, {
          origin,
          methods,
          allowedHeaders,
          exposedHeaders,
          credentials,
          maxAge,
        }),
      });
    }

    // Get response from next middleware/handler
    const response = await next();

    // Add CORS headers to response
    const headers = new Headers(response.headers);
    const corsHeaders = buildCorsHeaders(request, {
      origin,
      methods,
      allowedHeaders,
      exposedHeaders,
      credentials,
      maxAge,
    });

    for (const [key, value] of corsHeaders.entries()) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Build CORS headers based on request and options
 */
function buildCorsHeaders(
  request: Request,
  options: Required<CorsOptions>
): Headers {
  const headers = new Headers();
  const requestOrigin = request.headers.get('Origin');

  // Set Access-Control-Allow-Origin
  if (Array.isArray(options.origin)) {
    // If origin is an array, check if request origin is in the list
    if (requestOrigin && options.origin.includes(requestOrigin)) {
      headers.set('Access-Control-Allow-Origin', requestOrigin);
      headers.set('Vary', 'Origin');
    }
  } else if (options.origin === '*') {
    headers.set('Access-Control-Allow-Origin', '*');
  } else {
    headers.set('Access-Control-Allow-Origin', options.origin);
  }

  // Set Access-Control-Allow-Methods
  headers.set('Access-Control-Allow-Methods', options.methods.join(', '));

  // Set Access-Control-Allow-Headers
  if (options.allowedHeaders.length > 0) {
    headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));
  }

  // Set Access-Control-Expose-Headers
  if (options.exposedHeaders.length > 0) {
    headers.set('Access-Control-Expose-Headers', options.exposedHeaders.join(', '));
  }

  // Set Access-Control-Allow-Credentials
  if (options.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Set Access-Control-Max-Age
  headers.set('Access-Control-Max-Age', options.maxAge.toString());

  return headers;
}
