'use client';

import { ZONE_FURNITURE_MAP } from '@/lib/floorplan';
import FurnitureRenderer from './furniture/FurnitureRenderer';

/**
 * Renders all zone-specific furniture from ZONE_FURNITURE_MAP.
 * Mounts one FurnitureRenderer per placement entry across all 10 zones.
 */
export default function ZoneFurniture() {
  return (
    <group name="zoneFurniture">
      {Object.entries(ZONE_FURNITURE_MAP).map(([zoneId, placements]) =>
        placements.map((placement, index) => (
          <FurnitureRenderer
            key={`${zoneId}-${placement.type}-${index}`}
            placement={placement}
          />
        ))
      )}
    </group>
  );
}
