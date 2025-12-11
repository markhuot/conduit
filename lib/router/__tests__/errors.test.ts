import { describe, it, expect } from 'bun:test';
import {
  HttpError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  RedirectError,
  errorToResponse,
} from '../errors';

describe('HttpError', () => {
  it('creates error with status code and headers', () => {
    const error = new HttpError('Test error', 418, { 'X-Custom': 'value' }, 'TEST_ERROR');
    
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(418);
    expect(error.headers).toEqual({ 'X-Custom': 'value' });
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('HttpError');
  });

  it('works without optional parameters', () => {
    const error = new HttpError('Simple error', 500);
    
    expect(error.headers).toEqual({});
    expect(error.code).toBeUndefined();
  });
});

describe('NotFoundError', () => {
  it('has correct status code and error code', () => {
    const error = new NotFoundError('User not found');
    
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('User not found');
  });

  it('uses default message', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Not found');
  });

  it('accepts custom headers', () => {
    const error = new NotFoundError('Not found', { 'X-Custom': 'header' });
    expect(error.headers).toEqual({ 'X-Custom': 'header' });
  });
});

describe('UnauthorizedError', () => {
  it('has correct status code', () => {
    const error = new UnauthorizedError('Please log in');
    
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Please log in');
  });

  it('uses default message', () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe('Unauthorized');
  });
});

describe('ForbiddenError', () => {
  it('has correct status code', () => {
    const error = new ForbiddenError('Access denied');
    
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});

describe('BadRequestError', () => {
  it('has correct status code', () => {
    const error = new BadRequestError('Invalid input');
    
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
  });

  it('includes details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = new BadRequestError('Invalid input', details);
    
    expect(error.details).toEqual(details);
  });
});

describe('ConflictError', () => {
  it('has correct status code', () => {
    const error = new ConflictError('Resource already exists');
    
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });
});

describe('ValidationError', () => {
  it('has correct status code and includes field errors', () => {
    const errors = {
      email: ['Email is required', 'Email must be valid'],
      password: ['Password too short'],
    };
    const error = new ValidationError('Validation failed', errors);
    
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.errors).toEqual(errors);
  });
});

describe('TooManyRequestsError', () => {
  it('has correct status code', () => {
    const error = new TooManyRequestsError();
    
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('includes Retry-After header when retryAfter is provided', () => {
    const error = new TooManyRequestsError('Rate limit exceeded', 3600);
    
    expect(error.retryAfter).toBe(3600);
    expect(error.headers['Retry-After']).toBe('3600');
  });

  it('works without retryAfter', () => {
    const error = new TooManyRequestsError('Too many requests');
    
    expect(error.retryAfter).toBeUndefined();
    expect(error.headers['Retry-After']).toBeUndefined();
  });
});

describe('InternalServerError', () => {
  it('has correct status code', () => {
    const error = new InternalServerError('Database error');
    
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('uses default message', () => {
    const error = new InternalServerError();
    expect(error.message).toBe('Internal server error');
  });
});

describe('RedirectError', () => {
  it('creates redirect with default 302 status', () => {
    const error = new RedirectError('/dashboard');
    
    expect(error.statusCode).toBe(302);
    expect(error.headers.Location).toBe('/dashboard');
  });

  it('accepts custom status code', () => {
    const error = new RedirectError('/new-url', { status: 301 });
    
    expect(error.statusCode).toBe(301);
    expect(error.headers.Location).toBe('/new-url');
  });

  it('includes additional headers', () => {
    const error = new RedirectError('/login', {
      status: 302,
      headers: { 'Set-Cookie': 'message=Logged%20out' },
    });
    
    expect(error.headers.Location).toBe('/login');
    expect(error.headers['Set-Cookie']).toBe('message=Logged%20out');
  });
});

describe('errorToResponse', () => {
  it('converts NotFoundError to JSON response', async () => {
    const error = new NotFoundError('User not found');
    const response = errorToResponse(error, false);

    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(body.error.message).toBe('User not found');
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.stack).toBeUndefined();
  });

  it('includes stack trace in development mode', async () => {
    const error = new NotFoundError('User not found');
    const response = errorToResponse(error, true);

    const body = await response.json();
    expect(body.error.stack).toBeDefined();
  });

  it('includes validation errors', async () => {
    const errors = {
      email: ['Email is required'],
      password: ['Password too short'],
    };
    const error = new ValidationError('Validation failed', errors);
    const response = errorToResponse(error, false);

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error.errors).toEqual(errors);
  });

  it('includes details for BadRequestError', async () => {
    const details = { field: 'email', reason: 'invalid' };
    const error = new BadRequestError('Invalid input', details);
    const response = errorToResponse(error, false);

    const body = await response.json();
    expect(body.error.details).toEqual(details);
  });

  it('includes retryAfter for TooManyRequestsError', async () => {
    const error = new TooManyRequestsError('Rate limited', 3600);
    const response = errorToResponse(error, false);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('3600');

    const body = await response.json();
    expect(body.error.retryAfter).toBe(3600);
  });

  it('includes custom headers from error', async () => {
    const error = new NotFoundError('Not found', { 'X-Request-ID': '123' });
    const response = errorToResponse(error, false);

    expect(response.headers.get('X-Request-ID')).toBe('123');
  });

  it('converts RedirectError to redirect response without JSON', async () => {
    const error = new RedirectError('/dashboard');
    const response = errorToResponse(error, false);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');
    expect(response.body).toBeNull();
  });

  it('includes custom headers in redirect', () => {
    const error = new RedirectError('/login', {
      headers: { 'Set-Cookie': 'session=expired' },
    });
    const response = errorToResponse(error, false);

    expect(response.headers.get('Set-Cookie')).toBe('session=expired');
  });

  it('handles unexpected errors with 500 status', async () => {
    const error = new Error('Unexpected error');
    const response = errorToResponse(error, false);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error.message).toBe('An error occurred');
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('shows unexpected error message in development', async () => {
    const error = new Error('Database connection failed');
    const response = errorToResponse(error, true);

    const body = await response.json();
    expect(body.error.message).toBe('Database connection failed');
    expect(body.error.stack).toBeDefined();
  });
});
