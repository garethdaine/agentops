'use client';

import { useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OfficeFloor, OfficeWalls, OfficeLighting } from '@/slices/scene';
import { Workstation } from '@/slices/zones';
import { AgentAvatar } from '@/slices/agents';
import { WORKSTATION_SLOTS } from '@/lib/floorplan';
import { FOG_CONFIG } from '@/lib/lighting-config';
import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { useOfficeStore } from '@/stores/office-store';
import { getAgentColor } from '@/lib/avatar-animations';
import { mapToolToActivity } from '@/lib/event-mapper';
import AgentDetailPanel from '@/slices/panels/AgentDetailPanel';
import type { AgentState as StoreAgentState } from '@/stores/agent-store';
import type { AgentActivity } from '@/types/agent';

const INACTIVITY_TIMEOUT_MS = 60_000;

function deriveActivity(agent: StoreAgentState): AgentActivity {
  if (agent.currentTool) {
    return mapToolToActivity(agent.currentTool);
  }
  return 'idle';
}

export default function OfficeScene() {
  const activeAgents = useStore(useAgentStore, (s) => s.activeAgents);
  const selectedAgent = useStore(useOfficeStore, (s) => s.selectedAgent);
  const setSelectedAgent = useStore(useOfficeStore, (s) => s.setSelectedAgent);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const store = useAgentStore.getState();
      for (const agent of store.activeAgents) {
        if (agent.lastEventAt && now - new Date(agent.lastEventAt).getTime() > INACTIVITY_TIMEOUT_MS) {
          store.removeSession(agent.session_id);
        }
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const clearSelection = useStore(useOfficeStore, (s) => s.clearSelection);
  const handleAvatarClick = useCallback((sessionId: string) => {
    if (sessionId === selectedAgent) {
      clearSelection();
    } else {
      setSelectedAgent(sessionId);
    }
  }, [selectedAgent, setSelectedAgent, clearSelection]);

  return (
    <>
    <Canvas
      shadows
      camera={{ position: [20, 14, 20], fov: 50 }}
      gl={{ antialias: true }}
      style={{ background: '#1a1a2e' }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', FOG_CONFIG.near, FOG_CONFIG.far]} />

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

      {activeAgents.map((agent, i) => {
        if (i >= WORKSTATION_SLOTS.length) return null;
        const slot = WORKSTATION_SLOTS[i];
        const avatarZ = slot.rotation === Math.PI ? slot.position[2] - 1 : slot.position[2] + 1;
        return (
          <group
            key={agent.session_id}
            onClick={(e) => { e.stopPropagation(); handleAvatarClick(agent.session_id); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}
          >
            <AgentAvatar
              name={agent.name || `Agent ${i + 1}`}
              color={getAgentColor(agent.type)}
              position={[slot.position[0], slot.position[1], avatarZ]}
              activity={deriveActivity(agent)}
            />
          </group>
        );
      })}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />
    </Canvas>
    <AgentDetailPanel />
    </>
  );
}
