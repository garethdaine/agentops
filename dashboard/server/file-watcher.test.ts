/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileWatcher, type WatcherEvent, debounce } from './file-watcher.js';
import { parseLine, parseChunk } from './jsonl-parser.js';

// Poll until a condition is met, or timeout
async function waitUntil(
  condition: () => boolean,
  timeoutMs: number,
  intervalMs = 50,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// Helper to create a temporary directory for each test
function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fw-test-'));
}

function makeTelemetryLine(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    event: 'PostToolUse',
    session: 'test-session-id',
    tool: 'Bash',
    cwd: '/test',
    ...overrides,
  });
}

// ── JSONL Parser Tests ──────────────────────────────────────────────

describe('JSONL Parser', () => {
  it('should parse a valid JSON line', () => {
    const result = parseLine('{"key":"value"}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ key: 'value' });
    }
  });

  it('should return failure for malformed JSON', () => {
    const result = parseLine('{broken json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });

  it('should skip empty lines', () => {
    const result = parseLine('');
    expect(result.ok).toBe(false);
  });

  it('should parse a chunk with mixed valid and invalid lines', () => {
    const chunk = [
      '{"a":1}',
      'not json',
      '{"b":2}',
      '',
      '{"c":3}',
    ].join('\n');
    const results = parseChunk(chunk);
    expect(results).toHaveLength(3);
    expect(results).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });
});

// ── Debounce Tests ──────────────────────────────────────────────────

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce rapid file changes', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 150);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset the timer on each call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 150);

    debounced();
    vi.advanceTimersByTime(100);
    debounced(); // reset
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ── FileWatcher Tests ───────────────────────────────────────────────

describe('FileWatcher', () => {
  let tmpDir: string;
  let agentopsDir: string;
  let watcher: FileWatcher;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    agentopsDir = path.join(tmpDir, '.agentops');
  });

  afterEach(async () => {
    if (watcher) {
      await watcher.stop();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should detect appended lines in a JSONL file', async () => {
    fs.mkdirSync(agentopsDir, { recursive: true });
    const telemetryFile = path.join(agentopsDir, 'telemetry.jsonl');
    fs.writeFileSync(telemetryFile, '');

    const events: WatcherEvent[] = [];
    watcher = new FileWatcher(agentopsDir, 150, true);
    watcher.onEvent((e) => events.push(e));
    await watcher.start();

    // Append a line
    const line = makeTelemetryLine({ tool: 'Read' });
    fs.appendFileSync(telemetryFile, line + '\n');

    // Poll until chokidar + debounce fires (up to 3s)
    await waitUntil(
      () => events.some((e) => e.type === 'data'),
      3000,
    );

    const dataEvents = events.filter((e) => e.type === 'data');
    expect(dataEvents.length).toBeGreaterThanOrEqual(1);
    const allTelemetry = dataEvents.flatMap((e) =>
      e.type === 'data' ? e.events : [],
    );
    expect(allTelemetry.some((e) => e.tool === 'Read')).toBe(true);
  });

  it('should skip malformed JSON lines without crashing', async () => {
    fs.mkdirSync(agentopsDir, { recursive: true });
    const telemetryFile = path.join(agentopsDir, 'telemetry.jsonl');

    // Write mix of valid and invalid lines
    const content = [
      makeTelemetryLine({ tool: 'Bash' }),
      'this is not json at all {{{',
      makeTelemetryLine({ tool: 'Edit' }),
    ].join('\n') + '\n';

    fs.writeFileSync(telemetryFile, content);

    const events: WatcherEvent[] = [];
    watcher = new FileWatcher(agentopsDir, 150, true);
    watcher.onEvent((e) => events.push(e));
    await watcher.start(); // hydration should parse existing content

    const dataEvents = events.filter((e) => e.type === 'data');
    expect(dataEvents.length).toBeGreaterThanOrEqual(1);
    const allTelemetry = dataEvents.flatMap((e) =>
      e.type === 'data' ? e.events : [],
    );
    // Should have parsed 2 valid lines, skipped the malformed one
    expect(allTelemetry).toHaveLength(2);
    expect(allTelemetry[0].tool).toBe('Bash');
    expect(allTelemetry[1].tool).toBe('Edit');
  });

  it('should not re-read previously processed bytes', async () => {
    fs.mkdirSync(agentopsDir, { recursive: true });
    const telemetryFile = path.join(agentopsDir, 'telemetry.jsonl');

    // Write initial content
    const line1 = makeTelemetryLine({ tool: 'Bash' });
    fs.writeFileSync(telemetryFile, line1 + '\n');

    const events: WatcherEvent[] = [];
    watcher = new FileWatcher(agentopsDir, 150, true);
    watcher.onEvent((e) => events.push(e));
    await watcher.start();

    // Verify initial hydration read the first line
    const initialData = events.filter((e) => e.type === 'data');
    expect(initialData.length).toBe(1);

    // Check offset is tracked
    const offset = watcher.getOffset(telemetryFile);
    expect(offset).toBeGreaterThan(0);

    // Append a second line
    const line2 = makeTelemetryLine({ tool: 'Read' });
    fs.appendFileSync(telemetryFile, line2 + '\n');

    await waitUntil(() => events.filter((e) => e.type === 'data').length >= 2, 3000);

    // Should only get the new line, not re-read the first
    const allData = events.filter((e) => e.type === 'data');
    // First event has Bash, second event should have Read (not Bash again)
    if (allData.length >= 2) {
      const secondBatch = allData[1];
      if (secondBatch.type === 'data') {
        expect(secondBatch.events.every((e) => e.tool !== 'Bash')).toBe(true);
        expect(secondBatch.events.some((e) => e.tool === 'Read')).toBe(true);
      }
    }
  });

  it('should handle missing directory gracefully', async () => {
    // agentopsDir does NOT exist
    const events: WatcherEvent[] = [];
    watcher = new FileWatcher(agentopsDir, 150, true);
    watcher.onEvent((e) => events.push(e));

    // Should not throw
    await watcher.start();

    expect(watcher.getStatus()).toBe('waiting');
  });

  it('should emit waiting status when files are missing', async () => {
    const events: WatcherEvent[] = [];
    watcher = new FileWatcher(agentopsDir, 150, true);
    watcher.onEvent((e) => events.push(e));
    await watcher.start();

    const statusEvents = events.filter((e) => e.type === 'status');
    expect(statusEvents.length).toBeGreaterThanOrEqual(1);
    expect(statusEvents[0]).toMatchObject({
      type: 'status',
      status: 'waiting',
    });
  });

  it('should start tailing when files appear', async () => {
    // Start without directory
    const events: WatcherEvent[] = [];
    watcher = new FileWatcher(agentopsDir, 150, true);
    watcher.onEvent((e) => events.push(e));
    await watcher.start();

    expect(watcher.getStatus()).toBe('waiting');

    // Now create directory
    fs.mkdirSync(agentopsDir, { recursive: true });

    // Poll until chokidar notices the directory (up to 3s)
    await waitUntil(
      () => events.some((e) => e.type === 'status' && e.status === 'watching'),
      3000,
    );

    const statusEvents = events.filter(
      (e) => e.type === 'status' && e.status === 'watching',
    );
    expect(statusEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should hydrate existing content on startup', async () => {
    fs.mkdirSync(agentopsDir, { recursive: true });
    const telemetryFile = path.join(agentopsDir, 'telemetry.jsonl');

    // Write some content before starting the watcher
    const lines = [
      makeTelemetryLine({ tool: 'Bash', event: 'PostToolUse' }),
      makeTelemetryLine({ tool: 'Read', event: 'PostToolUse' }),
      makeTelemetryLine({ tool: 'Edit', event: 'PostToolUse' }),
    ];
    fs.writeFileSync(telemetryFile, lines.join('\n') + '\n');

    const events: WatcherEvent[] = [];
    watcher = new FileWatcher(agentopsDir, 150, true);
    watcher.onEvent((e) => events.push(e));
    await watcher.start();

    const dataEvents = events.filter((e) => e.type === 'data');
    expect(dataEvents.length).toBeGreaterThanOrEqual(1);
    const allTelemetry = dataEvents.flatMap((e) =>
      e.type === 'data' ? e.events : [],
    );
    expect(allTelemetry).toHaveLength(3);
  });

  it('should stop cleanly', async () => {
    fs.mkdirSync(agentopsDir, { recursive: true });
    watcher = new FileWatcher(agentopsDir, 150, true);
    await watcher.start();
    expect(watcher.getStatus()).toBe('watching');

    await watcher.stop();
    expect(watcher.getStatus()).toBe('stopped');
  });
});
