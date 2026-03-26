import * as fs from 'fs/promises';
import { readSessionRegistry } from './session-registry';

const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds

export interface IdleDetectorOptions {
  registryPath: string;
  idleTimeoutMs?: number;
  checkIntervalMs?: number;
}

/**
 * Monitors the session registry for activity and triggers shutdown
 * after a configurable idle period with no active sessions (REQ-022).
 */
export class IdleDetector {
  private registryPath: string;
  private idleTimeoutMs: number;
  private checkIntervalMs: number;
  private idleSince: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private shutdownCallbacks: Array<() => void> = [];
  private checking = false;

  constructor(options: IdleDetectorOptions) {
    this.registryPath = options.registryPath;
    this.idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    this.checkIntervalMs = options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS;
  }

  /** Register a callback to invoke when idle shutdown triggers. */
  onShutdown(callback: () => void): void {
    this.shutdownCallbacks.push(callback);
  }

  /** Start periodic idle checking. */
  start(): void {
    if (this.timer) return;
    this.idleSince = null;
    this.timer = setInterval(() => {
      void this.check();
    }, this.checkIntervalMs);
  }

  /** Stop periodic checking. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.idleSince = null;
  }

  private async check(): Promise<void> {
    if (this.checking) return;
    this.checking = true;
    try {
      const entries = await readSessionRegistry(this.registryPath);
      const hasActive = entries.some((e) => !e.stale);

      if (hasActive) {
        // Reset idle timer when active sessions exist
        this.idleSince = null;
        return;
      }

      // No active sessions
      if (this.idleSince === null) {
        this.idleSince = Date.now();
        return;
      }

      const elapsed = Date.now() - this.idleSince;
      if (elapsed >= this.idleTimeoutMs) {
        this.stop();
        for (const cb of this.shutdownCallbacks) {
          cb();
        }
      }
    } finally {
      this.checking = false;
    }
  }
}

/**
 * Remove the PID file. Silently succeeds if file does not exist.
 */
export async function cleanupPidFile(pidFilePath: string): Promise<void> {
  try {
    await fs.unlink(pidFilePath);
  } catch {
    // File already removed or never existed — that's fine
  }
}
