/**
 * Decoration layout data for the office scene.
 * Separates pure data from rendering for testability.
 */

/** A floor plant position with height variance. */
export interface PlantPosition {
  x: number;
  z: number;
  height: number;
}

/**
 * 6 floor plants positioned at zone edges and corners.
 * Heights vary between 0.8m and 1.2m for visual interest.
 */
export const PLANT_POSITIONS: PlantPosition[] = [
  { x: -12.5, z: -6, height: 1.1 },
  { x: -12.5, z: 5, height: 0.9 },
  { x: 12, z: -6, height: 1.2 },
  { x: 12, z: 5, height: 0.8 },
  { x: -8, z: -9, height: 1.0 },
  { x: 8, z: -9, height: 1.1 },
];

/** An equipment item with type, position, and rotation. */
export interface EquipmentPosition {
  type: 'waterCooler' | 'photocopier' | 'printer' | 'trashBin';
  x: number;
  z: number;
  rotation: number;
}

/**
 * 5 equipment items: water cooler, photocopier, printer, and 2 trash bins.
 * Positioned in corridors and near zone entrances.
 */
export const EQUIPMENT_POSITIONS: EquipmentPosition[] = [
  { type: 'waterCooler', x: -8, z: -6, rotation: 0 },
  { type: 'photocopier', x: -8, z: 5, rotation: Math.PI / 2 },
  { type: 'printer', x: 8, z: 2, rotation: -Math.PI / 2 },
  { type: 'trashBin', x: -7.5, z: -1, rotation: 0 },
  { type: 'trashBin', x: 7.5, z: 4, rotation: 0 },
];

/** Desk clutter distribution configuration. */
export interface DeskClutterConfig {
  keyboardOnAll: boolean;
  coffeeCupChance: number;
  paperStackChance: number;
  deterministic: boolean;
}

/** Configuration for desk clutter distribution. */
export const DESK_CLUTTER_CONFIG: DeskClutterConfig = {
  keyboardOnAll: true,
  coffeeCupChance: 0.4,
  paperStackChance: 0.35,
  deterministic: true,
};

/** A clutter item placed on a desk surface. */
export interface ClutterItem {
  type: 'keyboard' | 'coffeeCup' | 'paperStack';
  deskIndex: number;
}

/**
 * Compute deterministic desk clutter items for a given number of desks.
 * Uses modular arithmetic `(i * prime + offset) % modulus` instead of
 * Math.random to produce repeatable distributions:
 * - Keyboards on every desk
 * - Coffee cups on ~40% of desks: `(i * 7 + 3) % 5 < 2`
 * - Paper stacks on ~35% of desks: `(i * 11 + 1) % 6 < 2`
 */
export function computeClutterItems(deskCount: number): ClutterItem[] {
  const items: ClutterItem[] = [];

  for (let i = 0; i < deskCount; i++) {
    items.push({ type: 'keyboard', deskIndex: i });

    if ((i * 7 + 3) % 5 < 2) {
      items.push({ type: 'coffeeCup', deskIndex: i });
    }

    if ((i * 11 + 1) % 6 < 2) {
      items.push({ type: 'paperStack', deskIndex: i });
    }
  }

  return items;
}
