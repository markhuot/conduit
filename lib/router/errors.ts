/**
 * HTTP Error Classes
 * 
 * Type-safe error handling for HTTP responses. Handlers and middleware
 * can throw these errors, and the router automatically converts them
 * to appropriate HTTP responses.
 * 
 * @example
 * ```ts
 * // Throw in handler
 * if (!user) {
 *   throw new NotFoundError('User not found');
 * }
 * 
 * // Throw in middleware
 * if (!session) {
 *   throw new UnauthorizedError('Please log in');
 * }
 * 
 * // Redirect with custom headers
 * throw new RedirectError('/login', {
 *   headers: { 'Set-Cookie': 'message=Please%20log%20in' }
 * });
 * ```
 */

/**
 * Base HTTP error with status code and headers
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public headers: Record<string, string> = {},
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends HttpError {
  constructor(
    message: string,
    public details?: unknown,
    headers: Record<string, string> = {}
  ) {
    super(message, 400, headers, 'BAD_REQUEST');
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', headers: Record<string, string> = {}) {
    super(message, 401, headers, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', headers: Record<string, string> = {}) {
    super(message, 403, headers, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends HttpError {
  constructor(message = 'Not found', headers: Record<string, string> = {}) {
    super(message, 404, headers, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends HttpError {
  constructor(message: string, headers: Record<string, string> = {}) {
    super(message, 409, headers, 'CONFLICT');
  }
}

/**
 * 422 Unprocessable Entity (Validation Error)
 */
export class ValidationError extends HttpError {
  constructor(
    message: string,
    public errors: Record<string, string[]>,
    headers: Record<string, string> = {}
  ) {
    super(message, 422, headers, 'VALIDATION_ERROR');
  }
}

/**
 * 429 Too Many Requests
 */
export class TooManyRequestsError extends HttpError {
  constructor(
    message = 'Too many requests',
    public retryAfter?: number,
    headers: Record<string, string> = {}
  ) {
    const allHeaders = retryAfter 
      ? { ...headers, 'Retry-After': retryAfter.toString() }
      : headers;
    super(message, 429, allHeaders, 'TOO_MANY_REQUESTS');
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends HttpError {
  constructor(message = 'Internal server error', headers: Record<string, string> = {}) {
    super(message, 500, headers, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * Redirect Error (3xx status codes)
 * 
 * @example
 * ```ts
 * // Simple redirect
 * throw new RedirectError('/dashboard');
 * 
 * // Permanent redirect
 * throw new RedirectError('/new-url', { status: 301 });
 * 
 * // Redirect with cookie
 * throw new RedirectError('/login', {
 *   headers: { 'Set-Cookie': 'message=Logged%20out' }
 * });
 * ```
 */
export class RedirectError extends HttpError {
  constructor(
    location: string,
    options: {
      status?: 301 | 302 | 307 | 308;
      headers?: Record<string, string>;
    } = {}
  ) {
    const { status = 302, headers = {} } = options;
    super('Redirect', status, { ...headers, Location: location });
  }
}

/**
 * Convert an error to an HTTP Response
 * 
 * Handles both HttpError instances and unexpected errors.
 * For HttpError, uses the error's status code and headers.
 * For unexpected errors, returns 500 with generic message.
 * 
 * In production mode:
 * - Hides stack traces
 * - Shows generic "An error occurred" message for unexpected errors
 * - Still shows HttpError messages (they are intentional/safe)
 * 
 * @param error - The error to convert
 * @param development - Whether to include stack traces and detailed messages
 * @returns HTTP Response object
 */
export function errorToResponse(error: Error, development = false): Response {
  // Handle RedirectError specially - no JSON body
  if (error instanceof RedirectError) {
    return new Response(null, {
      status: error.statusCode,
      headers: error.headers,
    });
  }

  // Handle HttpError instances
  if (error instanceof HttpError) {
    const body: Record<string, any> = {
      error: {
        message: error.message,
        code: error.code,
      },
    };

    // Add validation errors if present
    if (error instanceof ValidationError) {
      body.error.errors = error.errors;
    }

    // Add details if present
    if ('details' in error && error.details !== undefined) {
      body.error.details = error.details;
    }

    // Add retryAfter if present
    if (error instanceof TooManyRequestsError && error.retryAfter !== undefined) {
      body.error.retryAfter = error.retryAfter;
    }

    // Add stack trace in development
    if (development) {
      body.error.stack = error.stack;
    }

    return new Response(JSON.stringify(body), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...error.headers,
      },
    });
  }

  // Handle unexpected errors (not HttpError)
  // In production, hide details for security
  return new Response(
    JSON.stringify({
      error: {
        message: development ? error.message : 'An error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        stack: development ? error.stack : undefined,
      },
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
