'use client';

import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import OfficeFloor from './OfficeFloor';
import OfficeWalls from './OfficeWalls';
import OfficeLighting from './OfficeLighting';
import Workstation from './Workstation';
import AgentAvatar from './AgentAvatar';
import { WORKSTATION_SLOTS } from '@/lib/floorplan';
import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { getAgentColor } from '@/lib/avatar-animations';
import { mapToolToActivity } from '@/lib/event-mapper';
import type { AgentState as StoreAgentState } from '@/stores/agent-store';
import type { AgentActivity } from '@/types/agent';

const INACTIVITY_TIMEOUT_MS = 60_000; // 60 seconds (REQ-040)

/**
 * Derive avatar activity from the store agent state.
 * Uses event mapper to convert current tool to animation activity,
 * with idle fallback when no tool is active (REQ-038).
 */
function deriveActivity(agent: StoreAgentState): AgentActivity {
  if (agent.currentTool) {
    return mapToolToActivity(agent.currentTool);
  }
  return 'idle';
}

/**
 * Root R3F scene component.
 * Renders the office floor, walls, lighting, workstations, and agent avatars.
 * Uses frameloop="demand" for on-demand rendering (REQ-034).
 * Avatars are driven reactively from the Zustand agent store (REQ-039, REQ-040).
 */
export default function OfficeScene() {
  const activeAgents = useStore(useAgentStore, (s) => s.activeAgents);

  // REQ-040: Remove inactive agents after 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const store = useAgentStore.getState();
      for (const agent of store.activeAgents) {
        if (agent.lastEventAt && now - new Date(agent.lastEventAt).getTime() > INACTIVITY_TIMEOUT_MS) {
          store.removeSession(agent.session_id);
        }
      }
    }, 10_000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Canvas
      frameloop="demand"
      shadows
      camera={{ position: [18, 14, 18], fov: 45 }}
      gl={{ antialias: true }}
      style={{ background: '#1a1a2e' }}
    >
      {/* Sky-like gradient background */}
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 35, 60]} />

      <OfficeLighting />
      <OfficeFloor />
      <OfficeWalls />

      {WORKSTATION_SLOTS.map((slot, i) => {
        const agent = activeAgents[i];
        return (
          <Workstation
            key={i}
            position={slot.position}
            rotation={slot.rotation}
            status={agent ? 'active' : 'idle'}
            activity={agent ? deriveActivity(agent) : 'idle'}
          />
        );
      })}

      {/* Agent avatars at workstation positions (REQ-035, REQ-039) */}
      {activeAgents.map((agent, i) => {
        if (i >= WORKSTATION_SLOTS.length) return null;
        const slot = WORKSTATION_SLOTS[i];
        // Position avatar slightly in front of the desk
        const avatarZ = slot.rotation === Math.PI ? slot.position[2] - 1 : slot.position[2] + 1;
        return (
          <AgentAvatar
            key={agent.session_id}
            name={agent.name || `Agent ${i + 1}`}
            color={getAgentColor(agent.type)}
            position={[slot.position[0], slot.position[1], avatarZ]}
            activity={deriveActivity(agent)}
          />
        );
      })}

      {/* OrbitControls with constraints (REQ-041, REQ-042) */}
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={8}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.2}
      />
    </Canvas>
  );
}
