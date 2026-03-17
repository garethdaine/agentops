# Enterprise Pattern: Graceful Shutdown

Generate the following graceful shutdown pattern adapted to the project's chosen framework.

## Shutdown Handler (`src/lib/shutdown.ts`)

```typescript
import { logger } from '@/lib/logger';

type CleanupFn = () => Promise<void> | void;

const cleanupHandlers: Array<{ name: string; fn: CleanupFn }> = [];
let isShuttingDown = false;

/**
 * Register a cleanup function to run during graceful shutdown.
 * Handlers run in reverse registration order (LIFO).
 *
 * @example
 * registerCleanup('database', async () => {
 *   await prisma.$disconnect();
 * });
 *
 * registerCleanup('http-server', async () => {
 *   await new Promise<void>((resolve) => server.close(resolve));
 * });
 */
export function registerCleanup(name: string, fn: CleanupFn): void {
  cleanupHandlers.push({ name, fn });
}

/**
 * Execute graceful shutdown. Called automatically on SIGTERM/SIGINT.
 * Runs all cleanup handlers with a timeout to prevent hanging.
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown...`);

  const SHUTDOWN_TIMEOUT_MS = 30_000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Shutdown timed out')), SHUTDOWN_TIMEOUT_MS),
  );

  try {
    // Run handlers in reverse order (LIFO)
    const handlers = [...cleanupHandlers].reverse();

    await Promise.race([
      (async () => {
        for (const handler of handlers) {
          try {
            logger.info(`Cleaning up: ${handler.name}`);
            await handler.fn();
            logger.info(`Cleaned up: ${handler.name}`);
          } catch (error) {
            logger.error(`Cleanup failed: ${handler.name}`, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      })(),
      timeoutPromise,
    ]);

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Shutdown timed out, forcing exit', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

/**
 * Install signal handlers. Call this once at application startup.
 */
export function installShutdownHandlers(): void {
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions — log and exit
  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught exception', { error: error.message, stack: error.stack });
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.fatal('Unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    shutdown('unhandledRejection');
  });
}
```

## Server Entry Point Integration

```typescript
import { installShutdownHandlers, registerCleanup } from '@/lib/shutdown';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

// Install signal handlers first
installShutdownHandlers();

// Start server
const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`Server started`, { port: env.PORT, host: env.HOST, env: env.NODE_ENV });
});

// Register cleanup: close HTTP server (stop accepting new connections, drain existing)
registerCleanup('http-server', async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

// Register cleanup: disconnect database
registerCleanup('database', async () => {
  // Adapt to chosen ORM:
  // Prisma: await prisma.$disconnect();
  // Drizzle: await pool.end();
  // TypeORM: await dataSource.destroy();
});
```

## Usage Notes

- Always install shutdown handlers at the very start of the application entry point
- Register cleanup handlers immediately after creating resources (server, DB connections, etc.)
- LIFO order ensures the HTTP server stops accepting connections before database disconnects
- The 30-second timeout prevents infinite hangs from stuck connections
- Docker sends SIGTERM first, then SIGKILL after the grace period (default 10s, configure with `stop_grace_period`)
- In Kubernetes, set `terminationGracePeriodSeconds` to match or exceed the shutdown timeout
