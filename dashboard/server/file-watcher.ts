/**
 * JSONL file watcher with byte-offset tracking.
 *
 * Watches .agentops/*.jsonl files using chokidar, reading only new bytes
 * appended since the last read. Debounces rapid file changes and handles
 * missing directories gracefully.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { type FSWatcher, watch } from 'chokidar';
import { parseChunk } from './jsonl-parser.js';

export interface TelemetryEvent {
  ts: string;
  event: string;
  session: string;
  tool: string;
  cwd?: string;
  [key: string]: unknown;
}

export type FileWatcherStatus = 'waiting' | 'watching' | 'stopped';

export interface StatusEvent {
  type: 'status';
  status: FileWatcherStatus;
  message: string;
}

export interface DataEvent {
  type: 'data';
  file: string;
  events: TelemetryEvent[];
}

export type WatcherEvent = StatusEvent | DataEvent;

export type EventHandler = (event: WatcherEvent) => void;

/**
 * Debounce helper: returns a function that delays invoking `fn` until
 * `ms` milliseconds have elapsed since the last call.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}

export class FileWatcher {
  private offsets = new Map<string, number>();
  private handlers: EventHandler[] = [];
  private watcher: FSWatcher | null = null;
  private dirWatcher: FSWatcher | null = null;
  private status: FileWatcherStatus = 'stopped';
  private debouncedHandlers = new Map<string, () => void>();

  constructor(
    private readonly watchDir: string,
    private readonly debounceMs: number = 150,
    private readonly usePolling: boolean = false,
  ) {}

  /** Register an event handler. */
  onEvent(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  /** Emit an event to all registered handlers. */
  private emit(event: WatcherEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  /** Read new bytes from a file starting at the tracked offset. */
  private readNewBytes(filePath: string): void {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return; // File may have been deleted
    }

    const currentOffset = this.offsets.get(filePath) ?? 0;
    if (stat.size <= currentOffset) return;

    const buffer = Buffer.alloc(stat.size - currentOffset);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, buffer.length, currentOffset);
    } finally {
      fs.closeSync(fd);
    }

    this.offsets.set(filePath, stat.size);

    const chunk = buffer.toString('utf-8');
    const events = parseChunk<TelemetryEvent>(chunk);

    if (events.length > 0) {
      this.emit({
        type: 'data',
        file: path.basename(filePath),
        events,
      });
    }
  }

  /** Get or create a debounced handler for a specific file. */
  private getDebouncedHandler(filePath: string): () => void {
    let handler = this.debouncedHandlers.get(filePath);
    if (!handler) {
      handler = debounce(() => this.readNewBytes(filePath), this.debounceMs);
      this.debouncedHandlers.set(filePath, handler);
    }
    return handler;
  }

  /** Hydrate from existing JSONL files on startup. */
  private hydrateExisting(): void {
    let files: string[];
    try {
      files = fs.readdirSync(this.watchDir).filter((f) => f.endsWith('.jsonl'));
    } catch {
      return; // Directory doesn't exist yet
    }

    for (const file of files) {
      const filePath = path.join(this.watchDir, file);
      this.readNewBytes(filePath);
    }
  }

  /** Check if a path is a JSONL file we should track. */
  private isJsonlFile(filePath: string): boolean {
    return filePath.endsWith('.jsonl');
  }

  /** Start watching the directory for JSONL file changes. */
  private async startWatching(): Promise<void> {
    if (this.watcher) return;

    // Watch the directory directly (not a glob) for chokidar v5 compatibility
    this.watcher = watch(this.watchDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 0,
      usePolling: this.usePolling,
      interval: this.usePolling ? 100 : undefined,
    });

    this.watcher.on('change', (filePath: string) => {
      if (!this.isJsonlFile(filePath)) return;
      const handler = this.getDebouncedHandler(filePath);
      handler();
    });

    this.watcher.on('add', (filePath: string) => {
      if (!this.isJsonlFile(filePath)) return;
      this.readNewBytes(filePath);
    });

    await this.waitForReady(this.watcher);
    this.setStatus('watching', `Watching ${this.watchDir}`);
  }

  /** Update status and emit a status event. */
  private setStatus(status: FileWatcherStatus, message: string): void {
    this.status = status;
    this.emit({ type: 'status', status, message });
  }

  /** Wait for a chokidar watcher to emit the 'ready' event. */
  private waitForReady(w: FSWatcher): Promise<void> {
    return new Promise((resolve) => {
      w.on('ready', resolve);
    });
  }

  /** Start the file watcher. Handles missing directories gracefully. */
  async start(): Promise<void> {
    if (fs.existsSync(this.watchDir)) {
      this.hydrateExisting();
      await this.startWatching();
    } else {
      this.setStatus('waiting', `Waiting for ${this.watchDir} to be created`);

      // Watch parent directory for the target directory to appear
      const parentDir = path.dirname(this.watchDir);
      const targetName = path.basename(this.watchDir);

      if (fs.existsSync(parentDir)) {
        this.dirWatcher = watch(parentDir, {
          persistent: true,
          ignoreInitial: true,
          depth: 0,
          usePolling: this.usePolling,
          interval: this.usePolling ? 100 : undefined,
        });

        this.dirWatcher.on('addDir', (dirPath: string) => {
          if (path.basename(dirPath) === targetName) {
            this.dirWatcher?.close();
            this.dirWatcher = null;
            this.hydrateExisting();
            this.startWatching();
          }
        });

        await this.waitForReady(this.dirWatcher);
      }
    }
  }

  /** Stop the file watcher and clean up. */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    if (this.dirWatcher) {
      await this.dirWatcher.close();
      this.dirWatcher = null;
    }
    this.debouncedHandlers.clear();
    this.setStatus('stopped', 'File watcher stopped');
  }

  /** Get the current byte offset for a file. */
  getOffset(filePath: string): number {
    return this.offsets.get(filePath) ?? 0;
  }

  /** Get current watcher status. */
  getStatus(): FileWatcherStatus {
    return this.status;
  }
}
