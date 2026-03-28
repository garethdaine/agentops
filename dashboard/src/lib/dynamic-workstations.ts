/**
 * Dynamic workstation grid expansion for multi-session support.
 * Grows the workstation zone when agent count exceeds base capacity.
 */

/** Base number of workstation slots in the default layout. */
const BASE_SLOTS = 9;

/** Columns per row in the workstation grid. */
const COLUMNS_PER_ROW = 3;

/** Maximum workstations to prevent floor overflow (8 rows of 3). */
const MAX_WORKSTATIONS = 24;

/** Spacing between columns (x-axis). */
const COLUMN_SPACING = 3;

/** Spacing between rows (z-axis). */
const ROW_SPACING = 2.8;

/** Grid origin offset so the layout stays centered in the workstation zone. */
const ORIGIN_X = -3;
const ORIGIN_Z = -10;

/** A workstation slot with its grid position and index. */
export interface WorkstationSlot {
  index: number;
  position: [number, number, number];
}

/**
 * Calculate how many workstation slots are needed for a given agent count.
 * Returns at least BASE_SLOTS, rounds up to the nearest row of 3, caps at MAX_WORKSTATIONS.
 */
export function calculateWorkstationSlots(agentCount: number): number {
  if (agentCount <= BASE_SLOTS) return BASE_SLOTS;
  const rounded = Math.ceil(agentCount / COLUMNS_PER_ROW) * COLUMNS_PER_ROW;
  return Math.min(rounded, MAX_WORKSTATIONS);
}

/**
 * Generate a grid of workstation slot positions for the given count.
 * Lays out slots in rows of COLUMNS_PER_ROW with consistent spacing.
 */
export function expandWorkstationGrid(count: number): WorkstationSlot[] {
  const slots: WorkstationSlot[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % COLUMNS_PER_ROW;
    const row = Math.floor(i / COLUMNS_PER_ROW);
    slots.push({
      index: i,
      position: [
        ORIGIN_X + col * COLUMN_SPACING,
        0,
        ORIGIN_Z + row * ROW_SPACING,
      ],
    });
  }
  return slots;
}
