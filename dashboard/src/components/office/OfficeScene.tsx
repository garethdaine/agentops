'use client';

import { useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import OfficeFloor from './OfficeFloor';
import OfficeWalls from './OfficeWalls';
import OfficeLighting from './OfficeLighting';
import Workstation from './Workstation';
import AgentAvatar from './AgentAvatar';
import { WORKSTATION_SLOTS } from '@/lib/floorplan';
import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { useUIStore } from '@/stores/ui-store';
import { getAgentColor } from '@/lib/avatar-animations';
import { mapToolToActivity } from '@/lib/event-mapper';
import type { AgentState as StoreAgentState } from '@/stores/agent-store';
import type { AgentActivity } from '@/types/agent';

const INACTIVITY_TIMEOUT_MS = 60_000;

function deriveActivity(agent: StoreAgentState): AgentActivity {
  if (agent.currentTool) {
    return mapToolToActivity(agent.currentTool);
  }
  return 'idle';
}

function SelectedAgentPanel({ agent }: { agent: StoreAgentState }) {
  const clearSelection = useStore(useUIStore, (s) => s.clearSelection);
  return (
    <Html position={[0, 3, 0]} center distanceFactor={10} style={{ pointerEvents: 'auto' }}>
      <div
        style={{
          background: 'rgba(0,0,0,0.85)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          lineHeight: '1.5',
          minWidth: '180px',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
        onClick={(e) => { e.stopPropagation(); clearSelection(); }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{agent.name || agent.session_id}</div>
        <div>Type: {agent.type}</div>
        <div>Status: {agent.status}</div>
        <div>Tool: {agent.currentTool || 'none'}</div>
        <div>Activity: {deriveActivity(agent)}</div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Click to dismiss</div>
      </div>
    </Html>
  );
}

export default function OfficeScene() {
  const activeAgents = useStore(useAgentStore, (s) => s.activeAgents);
  const selectedAgent = useStore(useUIStore, (s) => s.selectedAgent);
  const setSelectedAgent = useStore(useUIStore, (s) => s.setSelectedAgent);

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

  const clearSelection = useStore(useUIStore, (s) => s.clearSelection);
  const handleAvatarClick = useCallback((sessionId: string) => {
    if (sessionId === selectedAgent) {
      clearSelection();
    } else {
      setSelectedAgent(sessionId);
    }
  }, [selectedAgent, setSelectedAgent, clearSelection]);

  return (
    <Canvas
      shadows
      camera={{ position: [16, 10, 16], fov: 50 }}
      gl={{ antialias: true }}
      style={{ background: '#1a1a2e' }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 40, 65]} />

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
        const isSelected = selectedAgent === agent.session_id;
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
            {isSelected && (
              <group position={[slot.position[0], slot.position[1], avatarZ]}>
                <SelectedAgentPanel agent={agent} />
              </group>
            )}
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
  );
}
