import type { AgentActivity } from './agent';

/** 3D position vector. */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/** 2D size for zone footprints. */
export interface ZoneSize {
  width: number;
  depth: number;
}

/** A named zone in the office floor plan. */
export interface Zone {
  /** Unique zone identifier. */
  id: string;
  /** Display name for the zone. */
  name: string;
  /** Center position of the zone in 3D space. */
  position: Position3D;
  /** Floor footprint size. */
  size: ZoneSize;
}

/** A desk workstation that an agent can occupy. */
export interface Workstation {
  /** Zero-based index in the workstation array. */
  index: number;
  /** Position of the workstation in 3D space. */
  position: Position3D;
  /** Y-axis rotation in radians. */
  rotation: number;
  /** Whether an agent is currently seated here. */
  occupied: boolean;
  /** ID of the agent occupying this workstation, if any. */
  agentId?: string;
}

/** Visual state of an agent's 3D avatar. */
export interface AvatarState {
  /** Current animation activity. */
  activity: AgentActivity;
  /** Hex color for the avatar body. */
  color: string;
  /** Text displayed on the nameplate sprite above the avatar. */
  nameplate: string;
}

/** Content type displayed on a workstation monitor. */
export type MonitorContentType = 'code' | 'terminal' | 'log' | 'idle';

/** Styling for a workstation monitor's canvas texture. */
export interface MonitorStyle {
  /** Background color of the monitor. */
  backgroundColor: string;
  /** Text color on the monitor. */
  textColor: string;
  /** Type of content being displayed. */
  contentType: MonitorContentType;
}
