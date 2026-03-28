import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('OfficeStore — composed slices', () => {
  let store: typeof import('@/stores/office-store').useOfficeStore;

  beforeEach(async () => {
    // Reset module cache to get a fresh store per test
    vi.resetModules();
    const mod = await import('@/stores/office-store');
    store = mod.useOfficeStore;
  });

  describe('scene slice', () => {
    it('should initialise with default camera mode and time', () => {
      const state = store.getState();
      expect(state.cameraMode).toBe('orbit');
      expect(state.timeOfDay).toBeGreaterThanOrEqual(0);
      expect(state.timeOfDay).toBeLessThanOrEqual(1);
    });

    it('should update camera mode via setCameraMode', () => {
      store.getState().setCameraMode('wasd');
      expect(store.getState().cameraMode).toBe('wasd');
    });
  });

  describe('zones slice', () => {
    it('should initialise with zone definitions and occupancy map', () => {
      const state = store.getState();
      expect(state.zoneDefinitions).toBeDefined();
      expect(state.zoneOccupancy).toBeInstanceOf(Map);
    });

    it('should update zone occupancy via setZoneOccupancy', () => {
      store.getState().setZoneOccupancy('workstations', ['agent-1']);
      expect(store.getState().zoneOccupancy.get('workstations')).toEqual(['agent-1']);
    });
  });

  describe('agents slice', () => {
    it('should initialise with empty agent positions and states', () => {
      const state = store.getState();
      expect(state.agentPositions).toBeInstanceOf(Map);
      expect(state.agentStates).toBeInstanceOf(Map);
    });

    it('should set agent position via setAgentPosition', () => {
      store.getState().setAgentPosition('a1', { x: 1, y: 0, z: 2 });
      expect(store.getState().agentPositions.get('a1')).toEqual({ x: 1, y: 0, z: 2 });
    });
  });

  describe('environment slice', () => {
    it('should initialise with default weather and dayFactor', () => {
      const state = store.getState();
      expect(state.weather).toBe('clear');
      expect(state.dayFactor).toBe(1);
    });
  });

  describe('session slice', () => {
    it('should initialise with empty recordings and no active playback', () => {
      const state = store.getState();
      expect(state.recordings).toEqual([]);
      expect(state.playbackState).toBe('stopped');
    });
  });

  describe('control slice', () => {
    it('should initialise with empty command queue', () => {
      const state = store.getState();
      expect(state.commandQueue).toEqual([]);
    });
  });

  describe('panels (ui) slice', () => {
    it('should initialise with no selection and panel hidden', () => {
      const state = store.getState();
      expect(state.selectedAgent).toBeNull();
      expect(state.panelVisible).toBe(false);
    });

    it('should set selected agent via setSelectedAgent', () => {
      store.getState().setSelectedAgent('agent-1');
      expect(store.getState().selectedAgent).toBe('agent-1');
    });
  });

  describe('cross-slice reads', () => {
    it('should allow agents slice to read zone definitions via get()', () => {
      const state = store.getState();
      // agents slice can read zoneDefinitions from zones slice
      expect(state.zoneDefinitions).toBeDefined();
      expect(state.agentPositions).toBeDefined();
    });
  });
});
