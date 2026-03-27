/**
 * Pure derive functions for zone furniture visual feedback.
 * Each function maps system state to visual descriptors (color, intensity, mode)
 * consumed by furniture components as props.
 */

// ─── Thresholds ─────────────────────────────────────────────────

/** Load threshold below which traffic light shows green. */
const LOAD_THRESHOLD_LOW = 0.5;

/** Load threshold above which traffic light shows red. */
const LOAD_THRESHOLD_HIGH = 0.8;

/** Default LED pulse intensity for healthy state. */
const HEALTHY_PULSE_INTENSITY = 0.8;

/** Dim intensity for inactive/empty state. */
const DIM_INTENSITY = 0.3;

/** Alarm bell oscillation frequency in Hz. */
const ALARM_FREQUENCY_HZ = 2;

/** Emissive intensity when delegation is active on the whiteboard. */
const DELEGATION_EMISSIVE_INTENSITY = 0.6;

/** Baseline emissive intensity when whiteboard is idle. */
const BASELINE_EMISSIVE_INTENSITY = 0.02;

// ─── Types ──────────────────────────────────────────────────────

export interface ServerRackInput {
  agentStatuses: string[];
  errorCount: number;
}

export interface LedState {
  color: string;
  mode: 'pulse' | 'blink' | 'static';
  intensity: number;
}

export type TrafficColor = 'green' | 'amber' | 'red';

export interface WhiteboardGlowInput {
  delegationActive: boolean;
}

export interface WhiteboardGlow {
  emissiveIntensity: number;
  emissiveColor: string;
}

export type RuntimeMode = 'standard' | 'restricted' | 'locked';

export interface BarrierLedState {
  color: string;
  active: boolean;
}

export interface AlarmBellInput {
  rateLimited: boolean;
}

export interface AlarmBellPulse {
  active: boolean;
  frequency: number;
  color: string;
}

// ─── Derive Functions ───────────────────────────────────────────

/**
 * Derive server rack LED visual state from agent health.
 *
 * @param input.agentStatuses - Array of agent status strings (e.g. 'active', 'idle', 'error')
 * @param input.errorCount - Number of agents currently in error state
 * @returns LED state descriptor with color, animation mode, and intensity
 */
export function deriveServerRackLedState(input: ServerRackInput): LedState {
  const { agentStatuses, errorCount } = input;

  if (errorCount > 0) {
    return { color: '#ef4444', mode: 'blink', intensity: 1 };
  }

  if (agentStatuses.length === 0) {
    return { color: '#f59e0b', mode: 'static', intensity: DIM_INTENSITY };
  }

  return { color: '#10b981', mode: 'pulse', intensity: HEALTHY_PULSE_INTENSITY };
}

/**
 * Derive traffic light color from system load factor.
 *
 * @param load - Normalised load value in range [0, 1]
 * @returns Traffic light color: 'green', 'amber', or 'red'
 */
export function deriveTrafficLightColor(load: number): TrafficColor {
  if (load > LOAD_THRESHOLD_HIGH) {
    return 'red';
  }
  if (load >= LOAD_THRESHOLD_LOW) {
    return 'amber';
  }
  return 'green';
}

/**
 * Derive whiteboard emissive glow state from delegation activity.
 *
 * @param input.delegationActive - Whether a delegation is currently in progress
 * @returns Emissive intensity and color for the whiteboard surface
 */
export function deriveWhiteboardGlow(input: WhiteboardGlowInput): WhiteboardGlow {
  if (input.delegationActive) {
    return {
      emissiveIntensity: DELEGATION_EMISSIVE_INTENSITY,
      emissiveColor: '#4488ff',
    };
  }
  return {
    emissiveIntensity: BASELINE_EMISSIVE_INTENSITY,
    emissiveColor: '#4488ff',
  };
}

/**
 * Derive barrier gate LED state from runtime mode.
 *
 * @param mode - Current runtime mode: 'standard', 'restricted', or 'locked'
 * @returns LED color and active flag for the barrier indicator
 */
export function deriveBarrierLedState(mode: RuntimeMode): BarrierLedState {
  const colorMap: Record<RuntimeMode, string> = {
    standard: '#10b981',
    restricted: '#f59e0b',
    locked: '#ef4444',
  };

  return { color: colorMap[mode], active: true };
}

/**
 * Derive alarm bell pulse state from rate-limit status.
 *
 * @param input.rateLimited - Whether the system is currently rate-limited
 * @returns Pulse descriptor with active flag, frequency (Hz), and color
 */
export function deriveAlarmBellPulse(input: AlarmBellInput): AlarmBellPulse {
  if (input.rateLimited) {
    return {
      active: true,
      frequency: ALARM_FREQUENCY_HZ,
      color: '#ef4444',
    };
  }
  return { active: false, frequency: 0, color: '#ef4444' };
}
