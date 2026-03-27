/**
 * @vitest-environment node
 *
 * Performance verification tests for REQ-050, REQ-051, REQ-052.
 *
 * Since we cannot render WebGL in vitest/jsdom, we validate:
 * - Scene complexity bounds as a proxy for FPS (REQ-050)
 * - Relay pipeline latency: file write -> event emission (REQ-051)
 * - Memory consumption of server components (REQ-052)
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileWatcher, type WatcherEvent } from '../server/file-watcher.js';
import {
  WORKSTATION_SLOTS,
  WALL_PARTITIONS,
  ZONES,
} from '../src/lib/floorplan.js';

// ── Helpers ────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'perf-test-'));
}

function makeTelemetryLine(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    event: 'PostToolUse',
    session: 'perf-test-session',
    tool: 'Bash',
    cwd: '/test',
    ...overrides,
  });
}

async function waitUntil(
  condition: () => boolean,
  timeoutMs: number,
  intervalMs = 10,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ── REQ-050: Scene Complexity Bounds (FPS Proxy) ──────────────────

describe('REQ-050: Scene complexity bounds (FPS proxy)', () => {
  /**
   * We cannot measure browser FPS in vitest, so we validate that
   * the scene geometry count stays bounded. A bounded scene with
   * on-demand rendering (frameloop="demand") ensures 30+ FPS.
   */

  it('should have at most 12 workstation slots', () => {
    // 9 workstations in 28x22 layout; upper bound allows expansion
    expect(WORKSTATION_SLOTS.length).toBeLessThanOrEqual(12);
    expect(WORKSTATION_SLOTS.length).toBeGreaterThanOrEqual(4);
  });

  it('should have bounded wall partitions', () => {
    // Perimeter walls split by window/door gaps; keep under 25
    expect(WALL_PARTITIONS.length).toBeLessThanOrEqual(25);
  });

  it('should have bounded zone count', () => {
    // 10 zones in expanded layout; keep under 12
    expect(ZONES.length).toBeLessThanOrEqual(12);
  });

  it('should keep total scene object count under draw-call budget', () => {
    // Per workstation: desk + monitor + lamp + avatar (4 objects each)
    // Plus: floor plane, zone planes, wall partitions, 3 lights
    const perWorkstation = 4;
    const workstationObjects = WORKSTATION_SLOTS.length * perWorkstation;
    const floorObjects = 1 + ZONES.length; // base floor + zone tints
    const wallObjects = WALL_PARTITIONS.length;
    const lights = 3; // ambient + hemisphere + directional (REQ-033)
    const totalEstimate =
      workstationObjects + floorObjects + wallObjects + lights;

    // Budget: under 100 draw calls for 30+ FPS (REQ-122)
    expect(totalEstimate).toBeLessThan(100);
  });
});

// ── REQ-051: Event Delivery Latency ───────────────────────────────

describe('REQ-051: Event delivery latency', () => {
  let tmpDir: string;
  let watcher: FileWatcher;

  afterEach(async () => {
    if (watcher) {
      await watcher.stop();
    }
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should deliver events within 500ms of JSONL write', async () => {
    tmpDir = makeTmpDir();
    const agentopsDir = path.join(tmpDir, '.agentops');
    fs.mkdirSync(agentopsDir, { recursive: true });

    const telemetryFile = path.join(agentopsDir, 'telemetry.jsonl');
    fs.writeFileSync(telemetryFile, '');

    const events: WatcherEvent[] = [];
    // Use minimal debounce for latency measurement
    watcher = new FileWatcher(agentopsDir, 50, true);
    watcher.onEvent((e) => events.push(e));
    await watcher.start();

    // Measure: write a line and time until data event arrives
    const writeTime = performance.now();
    const line = makeTelemetryLine({ tool: 'Read', marker: 'latency-test' });
    fs.appendFileSync(telemetryFile, line + '\n');

    await waitUntil(
      () => events.some((e) => e.type === 'data'),
      3000,
    );

    const receiveTime = performance.now();
    const latencyMs = receiveTime - writeTime;

    const dataEvents = events.filter((e) => e.type === 'data');
    expect(dataEvents.length).toBeGreaterThanOrEqual(1);
    expect(latencyMs).toBeLessThan(500);
  });

  it('should deliver batch of 10 events within 500ms', async () => {
    tmpDir = makeTmpDir();
    const agentopsDir = path.join(tmpDir, '.agentops');
    fs.mkdirSync(agentopsDir, { recursive: true });

    const telemetryFile = path.join(agentopsDir, 'telemetry.jsonl');
    fs.writeFileSync(telemetryFile, '');

    const events: WatcherEvent[] = [];
    watcher = new FileWatcher(agentopsDir, 50, true);
    watcher.onEvent((e) => events.push(e));
    await watcher.start();

    // Write 10 lines at once
    const writeTime = performance.now();
    const lines = Array.from({ length: 10 }, (_, i) =>
      makeTelemetryLine({ tool: 'Bash', index: i }),
    );
    fs.appendFileSync(telemetryFile, lines.join('\n') + '\n');

    // Wait for all 10 events to be parsed
    await waitUntil(() => {
      const allTelemetry = events
        .filter((e) => e.type === 'data')
        .flatMap((e) => (e.type === 'data' ? e.events : []));
      return allTelemetry.length >= 10;
    }, 3000);

    const receiveTime = performance.now();
    const latencyMs = receiveTime - writeTime;

    const allTelemetry = events
      .filter((e) => e.type === 'data')
      .flatMap((e) => (e.type === 'data' ? e.events : []));
    expect(allTelemetry.length).toBeGreaterThanOrEqual(10);
    expect(latencyMs).toBeLessThan(500);
  });
});

// ── REQ-052: Memory Consumption ───────────────────────────────────

describe('REQ-052: Memory consumption', () => {
  let tmpDir: string;
  let watcher: FileWatcher;

  afterEach(async () => {
    if (watcher) {
      await watcher.stop();
    }
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should stay under 200MB heap after creating FileWatcher with mock data', async () => {
    tmpDir = makeTmpDir();
    const agentopsDir = path.join(tmpDir, '.agentops');
    fs.mkdirSync(agentopsDir, { recursive: true });

    // Create JSONL files with 1000 events each (simulating active session)
    const files = [
      'telemetry.jsonl',
      'audit.jsonl',
      'delegation.jsonl',
      'failures.jsonl',
    ];

    for (const file of files) {
      const lines = Array.from({ length: 1000 }, (_, i) =>
        makeTelemetryLine({
          tool: 'Bash',
          event: file.replace('.jsonl', ''),
          index: i,
          data: 'x'.repeat(200), // ~200 bytes of payload per line
        }),
      );
      fs.writeFileSync(
        path.join(agentopsDir, file),
        lines.join('\n') + '\n',
      );
    }

    // Force GC if available to get a clean baseline
    if (global.gc) global.gc();
    const baselineHeap = process.memoryUsage().heapUsed;

    // Create watcher and hydrate all files
    watcher = new FileWatcher(agentopsDir, 50, true);
    const events: WatcherEvent[] = [];
    watcher.onEvent((e) => events.push(e));
    await watcher.start();

    // Wait briefly for hydration
    await new Promise((r) => setTimeout(r, 100));

    const afterHeap = process.memoryUsage().heapUsed;
    const heapGrowthMB = (afterHeap - baselineHeap) / (1024 * 1024);

    // Watcher + 4000 parsed events should use well under 200MB
    // (500MB budget is for entire dashboard; watcher alone should be << 200MB)
    expect(heapGrowthMB).toBeLessThan(200);

    // Verify events were actually hydrated
    const dataEvents = events.filter((e) => e.type === 'data');
    expect(dataEvents.length).toBeGreaterThanOrEqual(4);
  });

  it('should not leak memory when processing many sequential writes', async () => {
    tmpDir = makeTmpDir();
    const agentopsDir = path.join(tmpDir, '.agentops');
    fs.mkdirSync(agentopsDir, { recursive: true });

    const telemetryFile = path.join(agentopsDir, 'telemetry.jsonl');
    fs.writeFileSync(telemetryFile, '');

    watcher = new FileWatcher(agentopsDir, 10);
    const events: WatcherEvent[] = [];
    watcher.onEvent((e) => events.push(e));
    await watcher.start();

    if (global.gc) global.gc();
    const baselineHeap = process.memoryUsage().heapUsed;

    // Write 100 batches of 10 events
    for (let batch = 0; batch < 100; batch++) {
      const lines = Array.from({ length: 10 }, (_, i) =>
        makeTelemetryLine({ tool: 'Bash', batch, index: i }),
      );
      fs.appendFileSync(telemetryFile, lines.join('\n') + '\n');
    }

    // Wait for processing
    await new Promise((r) => setTimeout(r, 500));

    if (global.gc) global.gc();
    const afterHeap = process.memoryUsage().heapUsed;
    const heapGrowthMB = (afterHeap - baselineHeap) / (1024 * 1024);

    // 1000 events should not cause excessive memory growth
    expect(heapGrowthMB).toBeLessThan(100);
  });
});
