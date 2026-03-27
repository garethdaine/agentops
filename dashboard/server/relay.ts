import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server, IncomingMessage } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IdleDetector, cleanupPidFile } from './lifecycle';
import { ClientTracker } from './client-tracker';
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
 * Handle an incoming message from a dashboard client.
 * Routes command messages to all other connected clients (broadcast-forward).
 */
function handleClientMessage(raw: string, sender: WebSocket, clients: Set<WebSocket>): void {
  try {
    const data = JSON.parse(raw);
    if (data.type !== 'command') return;

    log('info', `Command received: ${data.command} → ${data.target} (id: ${data.id})`);

    for (const client of clients) {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  } catch {
    log('warn', 'Received malformed message from client');
  }
}

/**
 * Start the WebSocket relay server.
 * Returns a handle with broadcast() and close() methods.
 */
export function startRelay(options: RelayOptions = {}): Promise<RelayHandle> {
  const port = options.port ?? DEFAULT_PORT;
  const clients = new Set<WebSocket>();

  const clientTracker = new ClientTracker();

  return new Promise((resolve, reject) => {
    const httpServer = createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/api/clients') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ count: clientTracker.getConnectedCount() }));
        return;
      }
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

    // Grace period timer: shuts down when all browser tabs close
    const DISCONNECT_GRACE_MS = 30_000; // 30 seconds
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function clearDisconnectTimer(): void {
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }
    }

    function startDisconnectTimer(): void {
      if (clients.size > 0) return;
      clearDisconnectTimer();
      log('info', `All clients disconnected — shutting down in ${DISCONNECT_GRACE_MS / 1000}s unless a client reconnects`);
      disconnectTimer = setTimeout(() => {
        if (clients.size === 0) {
          log('info', 'Grace period expired with no clients — shutting down');
          wss.emit('all-clients-gone');
        }
      }, DISCONNECT_GRACE_MS);
    }

    wss.on('connection', (ws, req) => {
      const origin = req.headers.origin ?? 'unknown';
      const clientId = `${origin}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      clients.add(ws);
      clientTracker.onConnect(clientId);
      clearDisconnectTimer();
      log('info', `Client connected (origin: ${origin}, total: ${clients.size})`);

      ws.on('message', (raw) => {
        handleClientMessage(raw.toString(), ws, clients);
      });

      ws.on('close', () => {
        clients.delete(ws);
        clientTracker.onDisconnect(clientId);
        log('info', `Client disconnected (total: ${clients.size})`);
        startDisconnectTimer();
      });

      ws.on('error', (err) => {
        log('error', `Client error: ${err.message}`);
        clients.delete(ws);
        clientTracker.onDisconnect(clientId);
        startDisconnectTimer();
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
  // PID file lives under the project's .agentops/ (same as dashboard-launch.sh)
  const pidFilePath = path.join(process.cwd(), '.agentops', 'dashboard.pid');
  const registryPath = path.join(os.homedir(), '.agentops', 'active-sessions.jsonl');

  // Dynamic imports for entry point only (not loaded during tests)
  import('./file-watcher').then(({ FileWatcher }) =>
  import('./session-registry').then(({ readSessionRegistry }) => {

  startRelay().then((relay) => {
    // Declare mutable references before shutdown to avoid TDZ
    let idleDetector: IdleDetector | null = null;
    let fileWatcher: FileWatcherType | null = null;
    const sessionWatchers: FileWatcherType[] = [];

    /**
     * Broadcast individual TelemetryEvents from a WatcherEvent envelope.
     * The client expects flat TelemetryEvent objects, not WatcherEvent wrappers.
     */
    const broadcastEvents = (event: import('./file-watcher').WatcherEvent) => {
      if (event.type === 'data') {
        for (const telemetryEvent of event.events) {
          relay.broadcast(JSON.stringify(telemetryEvent));
        }
      }
    };

    const shutdown = async () => {
      log('info', 'Shutting down relay...');
      idleDetector?.stop();
      await fileWatcher?.stop();
      await Promise.all(sessionWatchers.map(w => w.stop()));

      // Kill the Next.js companion process (PID file format: "RELAY_PID NEXT_PID")
      try {
        const pidContent = fs.readFileSync(pidFilePath, 'utf-8').trim();
        const nextPid = parseInt(pidContent.split(' ')[1], 10);
        if (nextPid && !isNaN(nextPid)) {
          log('info', `Killing Next.js process (PID ${nextPid})`);
          try { process.kill(nextPid, 'SIGTERM'); } catch { /* already gone */ }
        }
      } catch { /* PID file missing or unreadable */ }

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

    // Browser-close shutdown: all WebSocket clients disconnected for 30s
    relay.wss.on('all-clients-gone', () => {
      log('info', 'All browser tabs closed — initiating shutdown');
      void shutdown();
    });

    // Wire FileWatcher to relay broadcast (SPEC-001 fix)
    // Discover session directories from registry, watch each .agentops/ dir
    readSessionRegistry(registryPath).then((sessions) => {
      for (const session of sessions) {
        const agentopsDir = path.join(session.project_dir, '.agentops');
        const fw = new FileWatcher(agentopsDir);
        sessionWatchers.push(fw);
        fw.onEvent(broadcastEvents);
        fw.start().then(() => {
          log('info', `Watching ${agentopsDir}`);
        });
      }
    });

    // Also watch the cwd .agentops/ as a fallback
    const cwdAgentops = path.join(process.cwd(), '.agentops');
    fileWatcher = new FileWatcher(cwdAgentops);
    fileWatcher.onEvent(broadcastEvents);
    fileWatcher.start().then(() => {
      log('info', `Watching ${cwdAgentops}`);
    });
  });

  }));
}
