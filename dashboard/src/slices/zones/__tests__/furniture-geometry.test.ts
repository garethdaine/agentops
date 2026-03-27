import { describe, it, expect } from 'vitest';
import {
  DESK, MONITOR, LAMP,
  SERVER_RACK,
  CONFERENCE_TABLE,
  CONFERENCE_CHAIR,
  WHITEBOARD,
  BOOKSHELF,
  TOOL_BENCH,
  BARRIER_GATE,
  ALARM_BELL,
  MAIL_STATION,
  KITCHEN_COUNTER,
  PING_PONG_TABLE,
  SCREEN_WALL,
  TRAFFIC_LIGHT,
  FILING_CABINET,
  IDEA_BOARD,
} from '@/lib/furniture-geometry';

describe('furniture geometry constants', () => {
  describe('server rack', () => {
    it('should define server rack dimensions', () => {
      expect(SERVER_RACK).toBeDefined();
      expect(SERVER_RACK.width).toBeGreaterThan(0);
      expect(SERVER_RACK.height).toBeGreaterThan(0);
      expect(SERVER_RACK.depth).toBeGreaterThan(0);
      expect(SERVER_RACK.color).toBeDefined();
    });
  });

  describe('conference table', () => {
    it('should define conference table with length and width', () => {
      expect(CONFERENCE_TABLE).toBeDefined();
      expect(CONFERENCE_TABLE.length).toBeCloseTo(4, 0);
      expect(CONFERENCE_TABLE.width).toBeCloseTo(1.4, 1);
    });
  });

  describe('conference chair', () => {
    it('should define chair with seat, back, and base dimensions', () => {
      expect(CONFERENCE_CHAIR).toBeDefined();
      expect(CONFERENCE_CHAIR.seatWidth).toBeGreaterThan(0);
      expect(CONFERENCE_CHAIR.seatDepth).toBeGreaterThan(0);
      expect(CONFERENCE_CHAIR.backHeight).toBeGreaterThan(0);
    });
  });

  describe('all furniture types defined', () => {
    const types = [
      { name: 'WHITEBOARD', value: WHITEBOARD },
      { name: 'BOOKSHELF', value: BOOKSHELF },
      { name: 'TOOL_BENCH', value: TOOL_BENCH },
      { name: 'BARRIER_GATE', value: BARRIER_GATE },
      { name: 'ALARM_BELL', value: ALARM_BELL },
      { name: 'MAIL_STATION', value: MAIL_STATION },
      { name: 'KITCHEN_COUNTER', value: KITCHEN_COUNTER },
      { name: 'PING_PONG_TABLE', value: PING_PONG_TABLE },
      { name: 'SCREEN_WALL', value: SCREEN_WALL },
      { name: 'TRAFFIC_LIGHT', value: TRAFFIC_LIGHT },
      { name: 'FILING_CABINET', value: FILING_CABINET },
      { name: 'IDEA_BOARD', value: IDEA_BOARD },
    ];

    it.each(types)('should define $name with color property', ({ value }) => {
      expect(value).toBeDefined();
      expect(value.color).toBeDefined();
    });
  });
});

describe('zone furniture placement', () => {
  it('should export ZONE_FURNITURE_MAP keyed by zone id', async () => {
    const { ZONE_FURNITURE_MAP } = await import('@/lib/floorplan');
    expect(Object.keys(ZONE_FURNITURE_MAP)).toEqual(
      expect.arrayContaining([
        'serverRack', 'warRoom', 'securityDesk', 'workstations',
        'mailroom', 'conference', 'vault', 'toolWorkshop',
        'breakRoom', 'escalation',
      ])
    );
  });

  it('should place 4 server racks in serverRack zone', async () => {
    const { ZONE_FURNITURE_MAP } = await import('@/lib/floorplan');
    const racks = ZONE_FURNITURE_MAP.serverRack.filter(
      (f: { type: string }) => f.type === 'serverRack'
    );
    expect(racks).toHaveLength(4);
  });

  it('should place 8 conference chairs in conference zone', async () => {
    const { ZONE_FURNITURE_MAP } = await import('@/lib/floorplan');
    const chairs = ZONE_FURNITURE_MAP.conference.filter(
      (f: { type: string }) => f.type === 'conferenceChair'
    );
    expect(chairs).toHaveLength(8);
  });
});
