import { describe, it, expect } from 'vitest';
import {
  parseBuildExecution,
  extractCurrentPhase,
  extractActiveWaves,
  type BuildPhase,
  type BuildExecutionEntry,
  type BuildState,
} from '../build-lifecycle';

const sampleJSONL = [
  '{"type":"phase_start","phase":"Foundation","wave":0,"ts":"2026-03-26T10:00:00Z"}',
  '{"type":"task_start","task":"T001","wave":0,"ts":"2026-03-26T10:00:01Z"}',
  '{"type":"task_complete","task":"T001","wave":0,"status":"pass","ts":"2026-03-26T10:05:00Z"}',
  '{"type":"task_start","task":"T002","wave":0,"ts":"2026-03-26T10:05:01Z"}',
  '{"type":"phase_start","phase":"Floor and Zones","wave":1,"ts":"2026-03-26T10:10:00Z"}',
  '{"type":"task_start","task":"T006","wave":1,"ts":"2026-03-26T10:10:01Z"}',
].join('\n');

describe('Build Lifecycle', () => {
  describe('parseBuildExecution', () => {
    it('should parse valid JSONL into BuildExecutionEntry array', () => {
      const entries = parseBuildExecution(sampleJSONL);
      expect(entries).toHaveLength(6);
      expect(entries[0].type).toBe('phase_start');
      expect(entries[0].phase).toBe('Foundation');
    });

    it('should skip malformed lines gracefully', () => {
      const withBadLine = sampleJSONL + '\n{invalid json\n';
      const entries = parseBuildExecution(withBadLine);
      expect(entries).toHaveLength(6);
    });

    it('should return empty array for empty input', () => {
      expect(parseBuildExecution('')).toEqual([]);
    });
  });

  describe('extractCurrentPhase', () => {
    it('should return the latest phase_start entry', () => {
      const entries = parseBuildExecution(sampleJSONL);
      const phase = extractCurrentPhase(entries);
      expect(phase).not.toBeNull();
      expect(phase!.name).toBe('Floor and Zones');
      expect(phase!.wave).toBe(1);
    });

    it('should include task progress within current phase', () => {
      const entries = parseBuildExecution(sampleJSONL);
      const phase = extractCurrentPhase(entries);
      expect(phase!.tasksStarted).toBeGreaterThan(0);
    });

    it('should return null when no phases exist', () => {
      expect(extractCurrentPhase([])).toBeNull();
    });
  });

  describe('extractActiveWaves', () => {
    it('should return waves with in-progress tasks', () => {
      const entries = parseBuildExecution(sampleJSONL);
      const waves = extractActiveWaves(entries);
      expect(waves.length).toBeGreaterThanOrEqual(1);
      expect(waves.some(w => w.waveId === 0)).toBe(true);
      expect(waves.some(w => w.waveId === 1)).toBe(true);
    });

    it('should track completed vs total tasks per wave', () => {
      const entries = parseBuildExecution(sampleJSONL);
      const waves = extractActiveWaves(entries);
      const wave0 = waves.find(w => w.waveId === 0)!;
      expect(wave0.completedTasks).toBe(1);
      expect(wave0.startedTasks).toBe(2);
    });

    it('should return empty array when no tasks started', () => {
      expect(extractActiveWaves([])).toEqual([]);
    });
  });
});
