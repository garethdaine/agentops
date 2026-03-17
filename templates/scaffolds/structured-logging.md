# Enterprise Pattern: Structured JSON Logging

Generate the following logging pattern adapted to the project's chosen stack.

## Logger Module (`src/lib/logger.ts`)

```typescript
import { randomUUID } from 'node:crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  service: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const currentLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME ?? '{{project_name}}',
    ...context,
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog('debug')) console.debug(formatEntry('debug', message, context));
  },
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog('info')) console.info(formatEntry('info', message, context));
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog('warn')) console.warn(formatEntry('warn', message, context));
  },
  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog('error')) console.error(formatEntry('error', message, context));
  },
  fatal(message: string, context?: Record<string, unknown>) {
    if (shouldLog('fatal')) console.error(formatEntry('fatal', message, context));
  },

  /**
   * Create a child logger with pre-bound context (e.g., per-request).
   */
  child(defaultContext: Record<string, unknown>) {
    return {
      debug: (msg: string, ctx?: Record<string, unknown>) =>
        logger.debug(msg, { ...defaultContext, ...ctx }),
      info: (msg: string, ctx?: Record<string, unknown>) =>
        logger.info(msg, { ...defaultContext, ...ctx }),
      warn: (msg: string, ctx?: Record<string, unknown>) =>
        logger.warn(msg, { ...defaultContext, ...ctx }),
      error: (msg: string, ctx?: Record<string, unknown>) =>
        logger.error(msg, { ...defaultContext, ...ctx }),
      fatal: (msg: string, ctx?: Record<string, unknown>) =>
        logger.fatal(msg, { ...defaultContext, ...ctx }),
    };
  },
};

/**
 * Generate a correlation ID for request tracing.
 */
export function generateCorrelationId(): string {
  return randomUUID();
}
```

## Request Logging Middleware

```typescript
import { generateCorrelationId, logger } from '@/lib/logger';

// Adapt to the chosen framework's middleware pattern
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? generateCorrelationId();
  const requestId = generateCorrelationId();
  const start = Date.now();

  // Attach to request for downstream use
  req.correlationId = correlationId;
  req.requestId = requestId;

  // Set response header for client correlation
  res.setHeader('x-correlation-id', correlationId);
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('request completed', {
      correlationId,
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}
```

## Usage Notes

- In production, pipe stdout to a log aggregator (Datadog, CloudWatch, etc.)
- Use `logger.child()` to bind request context once, then log throughout the request lifecycle
- Always include `correlationId` for distributed tracing across services
- Never log sensitive data (passwords, tokens, PII) — use redaction middleware if needed
