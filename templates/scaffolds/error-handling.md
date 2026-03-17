# Enterprise Pattern: Structured Error Handling

Generate the following error handling pattern adapted to the project's chosen stack.

## Core Error Classes (`src/lib/errors.ts`)

```typescript
/**
 * Base application error with structured metadata.
 * All custom errors extend this class for consistent handling.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      isOperational?: boolean;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', details });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, {
      statusCode: 404,
      code: 'NOT_FOUND',
      details: { resource, ...(id && { id }) },
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, { statusCode: 401, code: 'UNAUTHENTICATED' });
  }
}

export class AuthorisationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, { statusCode: 403, code: 'FORBIDDEN' });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { statusCode: 409, code: 'CONFLICT', details });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds?: number) {
    super('Too many requests', {
      statusCode: 429,
      code: 'RATE_LIMITED',
      details: retryAfterSeconds ? { retryAfter: retryAfterSeconds } : undefined,
    });
  }
}
```

## API Error Response Format

All API errors return this consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email address is invalid",
    "details": {
      "field": "email",
      "value": "not-an-email"
    }
  }
}
```

## Error Handling Middleware (Express/Fastify/Hono)

```typescript
// Adapt to the chosen framework's middleware pattern
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn({ err, requestId: req.id }, err.message);
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Unexpected errors — log full stack, return generic message
  logger.error({ err, requestId: req.id }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

## React Error Boundary (if frontend)

```typescript
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```
