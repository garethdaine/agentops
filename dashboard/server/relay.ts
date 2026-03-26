import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server, IncomingMessage } from 'http';
import * as path from 'path';
import * as os from 'os';
import { IdleDetector, cleanupPidFile } from './lifecycle';
import type { FileWatcher as FileWatcherType } from './file-watcher';

const DEFAULT_PORT = 3099;

export interface RelayOptions {
  port?: number;
}

export interface RelayHandle {
  wss: WebSocketServer;
  httpServer: Server;
  broadcast: (data: string) => void;
  close: () => Promise<void>;
}

/**
 * Validate that an origin header represents a localhost connection.
 * Accepts localhost, 127.0.0.1, and [::1] with any port.
 */
export function isLocalhostOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

function log(level: 'info' | 'warn' | 'error', message: string): void {
  const ts = new Date().toISOString();
  const prefix = `[relay ${ts}]`;
  if (level === 'error') {
    console.error(`${prefix} ERROR: ${message}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} WARN: ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Start the WebSocket relay server.
 * Returns a handle with broadcast() and close() methods.
 */
export function startRelay(options: RelayOptions = {}): Promise<RelayHandle> {
  const port = options.port ?? DEFAULT_PORT;
  const clients = new Set<WebSocket>();

  return new Promise((resolve, reject) => {
    const httpServer = createServer((_req, res) => {
      res.writeHead(426, { 'Content-Type': 'text/plain' });
      res.end('WebSocket relay — upgrade required');
    });

    const wss = new WebSocketServer({
      server: httpServer,
      verifyClient: (
        info: { origin: string; req: IncomingMessage },
        callback: (result: boolean, code?: number, message?: string) => void,
      ) => {
        if (!isLocalhostOrigin(info.origin)) {
          log('warn', `Rejected connection from origin: ${info.origin}`);
          callback(false, 403, 'Forbidden: non-localhost origin');
          return;
        }
        callback(true);
      },
    });

    wss.on('connection', (ws, req) => {
      const origin = req.headers.origin ?? 'unknown';
      clients.add(ws);
      log('info', `Client connected (origin: ${origin}, total: ${clients.size})`);

      ws.on('close', () => {
        clients.delete(ws);
        log('info', `Client disconnected (total: ${clients.size})`);
      });

      ws.on('error', (err) => {
        log('error', `Client error: ${err.message}`);
        clients.delete(ws);
      });
    });

    function broadcast(data: string): void {
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      }
    }

    function close(): Promise<void> {
      return new Promise((res, rej) => {
        for (const client of clients) {
          client.close();
        }
        clients.clear();
        wss.close(() => {
          httpServer.close((err) => {
            if (err) rej(err);
            else res();
          });
        });
      });
    }

    httpServer.on('error', (err) => {
      reject(err);
    });

    httpServer.listen(port, () => {
      log('info', `WebSocket relay listening on port ${port}`);
      resolve({ wss, httpServer, broadcast, close });
    });
  });
}

// Entry point: run directly with node/tsx
const isEntryPoint =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('/relay.ts') || process.argv[1].endsWith('/relay.js'));

if (isEntryPoint) {
  const pidFilePath = path.join(os.homedir(), '.agentops', 'dashboard.pid');
  const registryPath = path.join(os.homedir(), '.agentops', 'active-sessions.jsonl');

  // Dynamic imports for entry point only (not loaded during tests)
  import('./file-watcher').then(({ FileWatcher }) =>
  import('./session-registry').then(({ readSessionRegistry }) => {

  startRelay().then((relay) => {
    // Declare mutable references before shutdown to avoid TDZ
    let idleDetector: IdleDetector | null = null;
    let fileWatcher: FileWatcherType | null = null;

    const shutdown = async () => {
      log('info', 'Shutting down relay...');
      idleDetector?.stop();
      await fileWatcher?.stop();
      await cleanupPidFile(pidFilePath);
      await relay.close();
      process.exit(0);
    };

    // Signal handlers for graceful shutdown (REQ-023)
    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());

    // Idle auto-shutdown (REQ-022)
    idleDetector = new IdleDetector({ registryPath });
    idleDetector.onShutdown(() => {
      log('info', 'Idle timeout reached — initiating auto-shutdown');
      void shutdown();
    });
    idleDetector.start();

    // Wire FileWatcher to relay broadcast (SPEC-001 fix)
    // Discover session directories from registry, watch each .agentops/ dir
    readSessionRegistry(registryPath).then((sessions) => {
      for (const session of sessions) {
        const agentopsDir = path.join(session.project_dir, '.agentops');
        const fw = new FileWatcher(agentopsDir);
        fw.onEvent((event) => {
          relay.broadcast(JSON.stringify(event));
        });
        fw.start().then(() => {
          log('info', `Watching ${agentopsDir}`);
        });
      }
    });

    // Also watch the cwd .agentops/ as a fallback
    const cwdAgentops = path.join(process.cwd(), '.agentops');
    fileWatcher = new FileWatcher(cwdAgentops);
    fileWatcher.onEvent((event) => {
      relay.broadcast(JSON.stringify(event));
    });
    fileWatcher.start().then(() => {
      log('info', `Watching ${cwdAgentops}`);
    });
  });

  }));
}
