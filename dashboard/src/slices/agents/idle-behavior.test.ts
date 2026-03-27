import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  IdleBehaviorScheduler,
  WANDER_ZONES,
  pickWeightedZone,
  type IdlePhase,
  type SchedulerApi,
} from './idle-behavior';

describe('WANDER_ZONES', () => {
  it('should define 6 wander zones with weights', () => {
    expect(WANDER_ZONES).toHaveLength(6);
    WANDER_ZONES.forEach((z) => {
      expect(z).toHaveProperty('zoneId');
      expect(z).toHaveProperty('activity');
      expect(z).toHaveProperty('weight');
      expect(z).toHaveProperty('minStay');
      expect(z).toHaveProperty('maxStay');
      expect(z.weight).toBeGreaterThan(0);
    });
  });

  it('should assign breakRoom weight=3 (highest)', () => {
    const br = WANDER_ZONES.find((z) => z.zoneId === 'breakRoom');
    expect(br?.weight).toBe(3);
  });

  it('should assign conference weight=2', () => {
    const conf = WANDER_ZONES.find((z) => z.zoneId === 'conference');
    expect(conf?.weight).toBe(2);
  });

  it('should assign chatting activity at breakRoom and conference', () => {
    const chatZones = WANDER_ZONES.filter((z) => z.activity === 'chatting');
    const ids = chatZones.map((z) => z.zoneId);
    expect(ids).toContain('breakRoom');
    expect(ids).toContain('conference');
  });

  it('should assign reading activity at mailroom and vault', () => {
    const readZones = WANDER_ZONES.filter((z) => z.activity === 'reading');
    const ids = readZones.map((z) => z.zoneId);
    expect(ids).toContain('mailroom');
    expect(ids).toContain('vault');
  });
});

describe('pickWeightedZone', () => {
  it('should never return the excluded zone', () => {
    for (let i = 0; i < 100; i++) {
      const zone = pickWeightedZone('breakRoom');
      expect(zone.zoneId).not.toBe('breakRoom');
    }
  });

  it('should return a valid wander zone', () => {
    const zone = pickWeightedZone(null);
    const allIds = WANDER_ZONES.map((z) => z.zoneId);
    expect(allIds).toContain(zone.zoneId);
  });

  it('should statistically favor higher-weight zones', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 10000; i++) {
      const zone = pickWeightedZone(null);
      counts[zone.zoneId] = (counts[zone.zoneId] ?? 0) + 1;
    }
    // breakRoom (weight 3) should appear more than vault (weight 1)
    expect(counts['breakRoom']!).toBeGreaterThan(counts['vault']!);
  });
});

describe('IdleBehaviorScheduler', () => {
  let scheduler: IdleBehaviorScheduler;
  let moveToZone: Mock<SchedulerApi['moveToZone']>;
  let moveToPosition: Mock<SchedulerApi['moveToPosition']>;
  let setState: Mock<SchedulerApi['setState']>;

  beforeEach(() => {
    scheduler = new IdleBehaviorScheduler();
    moveToZone = vi.fn<SchedulerApi['moveToZone']>();
    moveToPosition = vi.fn<SchedulerApi['moveToPosition']>();
    setState = vi.fn<SchedulerApi['setState']>();
  });

  const api = (): SchedulerApi => ({ moveToZone, moveToPosition, setState });

  it('should register an agent with at_desk phase', () => {
    scheduler.register('agent-1', { x: 0, z: -2 });
    const entry = scheduler.getEntry('agent-1');
    expect(entry).toBeTruthy();
    expect(entry!.phase).toBe('at_desk');
  });

  it('should unregister an agent', () => {
    scheduler.register('agent-1', { x: 0, z: -2 });
    scheduler.unregister('agent-1');
    expect(scheduler.getEntry('agent-1')).toBeUndefined();
  });

  it('should not move agents during at_desk phase until timer expires', () => {
    scheduler.register('agent-1', { x: 0, z: -2 });
    scheduler.tick(1.0, api());
    expect(moveToZone).not.toHaveBeenCalled();
  });

  it('should transition to walking_to when at_desk timer expires', () => {
    scheduler.register('agent-1', { x: 0, z: -2 });
    // Force timer to 0 for testing
    scheduler.getEntry('agent-1')!.timer = 0;
    scheduler.tick(0.1, api());
    expect(moveToZone).toHaveBeenCalledOnce();
    expect(scheduler.getEntry('agent-1')!.phase).toBe('walking_to');
  });

  it('should set zone-specific activity when arriving at zone', () => {
    scheduler.register('agent-1', { x: 0, z: -2 });
    const entry = scheduler.getEntry('agent-1')!;
    entry.timer = 0;
    scheduler.tick(0.1, api());
    // Simulate arrival callback
    entry.phase = 'at_zone';
    entry.timer = 5;
    // Phase should now be at_zone with pending stay time
    expect(entry.phase).toBe('at_zone');
  });

  it('should set busy=true and force return to desk', () => {
    scheduler.register('agent-1', { x: 0, z: -2 });
    const entry = scheduler.getEntry('agent-1')!;
    entry.phase = 'at_zone';
    entry.timer = 10;
    scheduler.setBusy('agent-1', true);
    expect(entry.busy).toBe(true);
    expect(entry.phase).toBe('returning');
  });

  it('should not move busy agents during tick', () => {
    scheduler.register('agent-1', { x: 0, z: -2 });
    scheduler.setBusy('agent-1', true);
    scheduler.getEntry('agent-1')!.timer = 0;
    scheduler.tick(1.0, api());
    expect(moveToZone).not.toHaveBeenCalled();
  });

  it('should resume at_desk phase when busy clears', () => {
    scheduler.register('agent-1', { x: 0, z: -2 });
    scheduler.setBusy('agent-1', true);
    scheduler.setBusy('agent-1', false);
    const entry = scheduler.getEntry('agent-1')!;
    expect(entry.phase).toBe('at_desk');
    expect(entry.busy).toBe(false);
    expect(entry.timer).toBeGreaterThanOrEqual(8);
    expect(entry.timer).toBeLessThanOrEqual(25);
  });

  it('should dispose all agents', () => {
    scheduler.register('agent-1', { x: 0, z: -2 });
    scheduler.register('agent-2', { x: 3, z: -2 });
    scheduler.dispose();
    expect(scheduler.getEntry('agent-1')).toBeUndefined();
    expect(scheduler.getEntry('agent-2')).toBeUndefined();
  });
});
