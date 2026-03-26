import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  readSessionRegistry,
  getActiveProjectDirs,
  type SessionEntry,
} from './session-registry';

describe('SessionRegistry', () => {
  let tmpDir: string;
  let registryPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'session-registry-test-'));
    registryPath = path.join(tmpDir, 'active-sessions.jsonl');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should read valid registry file entries', async () => {
    const now = new Date().toISOString();
    const entries = [
      { session_id: 'sess-001', project_dir: '/projects/alpha', started_at: now, pid: process.pid },
      { session_id: 'sess-002', project_dir: '/projects/beta', started_at: now, pid: process.pid },
    ];
    const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await fs.writeFile(registryPath, content);

    const result = await readSessionRegistry(registryPath);
    expect(result).toHaveLength(2);
    expect(result[0].session_id).toBe('sess-001');
    expect(result[0].project_dir).toBe('/projects/alpha');
    expect(result[1].session_id).toBe('sess-002');
    expect(result[1].project_dir).toBe('/projects/beta');
  });

  it('should handle missing registry file gracefully', async () => {
    const result = await readSessionRegistry(path.join(tmpDir, 'nonexistent.jsonl'));
    expect(result).toEqual([]);
  });

  it('should skip malformed JSONL lines without crashing', async () => {
    const now = new Date().toISOString();
    const content = [
      JSON.stringify({ session_id: 'sess-001', project_dir: '/projects/alpha', started_at: now, pid: process.pid }),
      'this is not valid json',
      '',
      JSON.stringify({ session_id: 'sess-003', project_dir: '/projects/gamma', started_at: now, pid: process.pid }),
    ].join('\n') + '\n';
    await fs.writeFile(registryPath, content);

    const result = await readSessionRegistry(registryPath);
    expect(result).toHaveLength(2);
    expect(result[0].session_id).toBe('sess-001');
    expect(result[1].session_id).toBe('sess-003');
  });

  it('should mark sessions stale after 5 minutes of no events', async () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const justNow = new Date().toISOString();

    const entries = [
      { session_id: 'sess-stale', project_dir: '/projects/stale', started_at: sixMinutesAgo, pid: process.pid, last_event_at: sixMinutesAgo },
      { session_id: 'sess-active', project_dir: '/projects/active', started_at: justNow, pid: process.pid, last_event_at: justNow },
    ];
    const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await fs.writeFile(registryPath, content);

    const result = await readSessionRegistry(registryPath);
    const stale = result.find((e) => e.session_id === 'sess-stale');
    const active = result.find((e) => e.session_id === 'sess-active');

    expect(stale).toBeDefined();
    expect(stale!.stale).toBe(true);
    expect(active).toBeDefined();
    expect(active!.stale).toBe(false);
  });

  it('should treat sessions with no last_event_at as using started_at for staleness', async () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();

    const entries = [
      { session_id: 'sess-old', project_dir: '/projects/old', started_at: sixMinutesAgo, pid: process.pid },
    ];
    const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await fs.writeFile(registryPath, content);

    const result = await readSessionRegistry(registryPath);
    expect(result[0].stale).toBe(true);
  });

  it('should return list of active project directories', async () => {
    const now = new Date().toISOString();
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();

    const entries = [
      { session_id: 'sess-001', project_dir: '/projects/alpha', started_at: now, pid: process.pid, last_event_at: now },
      { session_id: 'sess-002', project_dir: '/projects/beta', started_at: sixMinutesAgo, pid: process.pid, last_event_at: sixMinutesAgo },
      { session_id: 'sess-003', project_dir: '/projects/gamma', started_at: now, pid: process.pid, last_event_at: now },
    ];
    const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await fs.writeFile(registryPath, content);

    const dirs = await getActiveProjectDirs(registryPath);
    expect(dirs).toContain('/projects/alpha');
    expect(dirs).toContain('/projects/gamma');
    expect(dirs).not.toContain('/projects/beta');
  });

  it('should return empty array from getActiveProjectDirs when file missing', async () => {
    const dirs = await getActiveProjectDirs(path.join(tmpDir, 'missing.jsonl'));
    expect(dirs).toEqual([]);
  });

  it('should deduplicate project directories', async () => {
    const now = new Date().toISOString();
    const entries = [
      { session_id: 'sess-001', project_dir: '/projects/alpha', started_at: now, pid: process.pid, last_event_at: now },
      { session_id: 'sess-002', project_dir: '/projects/alpha', started_at: now, pid: process.pid, last_event_at: now },
    ];
    const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    await fs.writeFile(registryPath, content);

    const dirs = await getActiveProjectDirs(registryPath);
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toBe('/projects/alpha');
  });
});
