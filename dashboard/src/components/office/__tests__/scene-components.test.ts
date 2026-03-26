import { describe, it, expect } from 'vitest';

/**
 * R3F component import tests.
 *
 * WebGL-based Canvas rendering cannot work in jsdom, so we verify
 * that all scene components can be imported without errors and export
 * the expected default functions.
 */

describe('OfficeScene component exports', () => {
  it('should export OfficeScene as default', async () => {
    const mod = await import('../OfficeScene');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('OfficeFloor component exports', () => {
  it('should export OfficeFloor as default', async () => {
    const mod = await import('../OfficeFloor');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('OfficeWalls component exports', () => {
  it('should export OfficeWalls as default', async () => {
    const mod = await import('../OfficeWalls');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('OfficeLighting component exports', () => {
  it('should export OfficeLighting as default', async () => {
    const mod = await import('../OfficeLighting');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('Workstation component exports', () => {
  it('should export Workstation as default', async () => {
    const mod = await import('../Workstation');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('MonitorScreen component exports', () => {
  it('should export MonitorScreen as default', async () => {
    const mod = await import('../MonitorScreen');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('MonitorScreen animation logic', () => {
  it('should export drawScrollingCode utility', async () => {
    const mod = await import('../MonitorScreen');
    expect(mod.drawScrollingCode).toBeDefined();
    expect(typeof mod.drawScrollingCode).toBe('function');
  });
});
