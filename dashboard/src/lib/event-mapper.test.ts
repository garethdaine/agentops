import { describe, it, expect } from 'vitest';
import {
  mapToolToActivity,
  mapToolToMonitorStyle,
  inferActivityFromTimestamp,
} from './event-mapper';
import type { AgentActivity, MonitorStyle } from './telemetry-types';

describe('mapToolToActivity', () => {
  it('should map Bash tool to typing activity', () => {
    expect(mapToolToActivity('Bash')).toBe('typing');
  });

  it('should map Write tool to typing activity', () => {
    expect(mapToolToActivity('Write')).toBe('typing');
  });

  it('should map Edit tool to typing activity', () => {
    expect(mapToolToActivity('Edit')).toBe('typing');
  });

  it('should map Read tool to reading activity', () => {
    expect(mapToolToActivity('Read')).toBe('reading');
  });

  it('should map Grep tool to reading activity', () => {
    expect(mapToolToActivity('Grep')).toBe('reading');
  });

  it('should map Glob tool to reading activity', () => {
    expect(mapToolToActivity('Glob')).toBe('reading');
  });

  it('should map Agent tool to chatting activity', () => {
    expect(mapToolToActivity('Agent')).toBe('chatting');
  });

  it('should map unknown tool to idle activity', () => {
    expect(mapToolToActivity('UnknownTool')).toBe('idle');
  });

  it('should map empty string to idle activity', () => {
    expect(mapToolToActivity('')).toBe('idle');
  });
});

describe('mapToolToMonitorStyle', () => {
  it('should return green for Bash tool', () => {
    const style = mapToolToMonitorStyle('Bash');
    expect(style.color).toBe('green');
    expect(style.contentType).toBe('terminal');
  });

  it('should return blue for Read tool', () => {
    const style = mapToolToMonitorStyle('Read');
    expect(style.color).toBe('blue');
    expect(style.contentType).toBe('file');
  });

  it('should return red-green for Edit tool', () => {
    const style = mapToolToMonitorStyle('Edit');
    expect(style.color).toBe('red-green');
    expect(style.contentType).toBe('diff');
  });

  it('should return red-green for Write tool', () => {
    const style = mapToolToMonitorStyle('Write');
    expect(style.color).toBe('red-green');
    expect(style.contentType).toBe('diff');
  });

  it('should return yellow for Grep tool', () => {
    const style = mapToolToMonitorStyle('Grep');
    expect(style.color).toBe('yellow');
    expect(style.contentType).toBe('search');
  });

  it('should return yellow for Glob tool', () => {
    const style = mapToolToMonitorStyle('Glob');
    expect(style.color).toBe('yellow');
    expect(style.contentType).toBe('search');
  });

  it('should return purple for Agent tool', () => {
    const style = mapToolToMonitorStyle('Agent');
    expect(style.color).toBe('purple');
    expect(style.contentType).toBe('chat');
  });

  it('should return gray for unknown tool', () => {
    const style = mapToolToMonitorStyle('UnknownTool');
    expect(style.color).toBe('gray');
    expect(style.contentType).toBe('idle');
  });
});

describe('inferActivityFromTimestamp', () => {
  it('should return idle when gap exceeds 10 seconds', () => {
    const now = Date.now();
    const lastEvent = now - 11_000; // 11 seconds ago
    expect(inferActivityFromTimestamp(lastEvent, now)).toBe('idle');
  });

  it('should return null when gap is within 10 seconds', () => {
    const now = Date.now();
    const lastEvent = now - 5_000; // 5 seconds ago
    expect(inferActivityFromTimestamp(lastEvent, now)).toBeNull();
  });

  it('should return idle at exactly 10 seconds', () => {
    const now = Date.now();
    const lastEvent = now - 10_000; // exactly 10 seconds
    expect(inferActivityFromTimestamp(lastEvent, now)).toBe('idle');
  });

  it('should return null when timestamps are the same', () => {
    const now = Date.now();
    expect(inferActivityFromTimestamp(now, now)).toBeNull();
  });
});
