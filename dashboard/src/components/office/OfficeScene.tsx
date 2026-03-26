'use client';

import { useEffect, useMemo } from 'react';
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
import { getAgentColor, AGENT_COLORS } from '@/lib/avatar-animations';
import { mapToolToActivity } from '@/lib/event-mapper';
import type { AgentState as StoreAgentState } from '@/stores/agent-store';
import type { AgentActivity } from '@/types/agent';

const INACTIVITY_TIMEOUT_MS = 60_000;

/** Demo agents shown when no real agents are connected (development aid). */
const DEMO_AGENTS: Array<{ name: string; type: string; activity: AgentActivity; tool: string }> = [
  { name: 'Claude (main)', type: 'main', activity: 'typing', tool: 'Edit' },
  { name: 'Code Critic', type: 'code-critic', activity: 'reading', tool: 'Read' },
  { name: 'Security Reviewer', type: 'security-reviewer', activity: 'reading', tool: 'Grep' },
  { name: 'Plan Validator', type: 'plan-validator', activity: 'idle', tool: '' },
];

function deriveActivity(agent: StoreAgentState): AgentActivity {
  if (agent.currentTool) {
    return mapToolToActivity(agent.currentTool);
  }
  return 'idle';
}

export default function OfficeScene() {
  const activeAgents = useStore(useAgentStore, (s) => s.activeAgents);
  const showDemo = activeAgents.length === 0;

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

  const agentsToRender = useMemo(() => {
    if (!showDemo) return activeAgents.map((agent, i) => ({
      key: agent.session_id,
      name: agent.name || `Agent ${i + 1}`,
      color: getAgentColor(agent.type),
      activity: deriveActivity(agent),
      status: 'active' as const,
      tool: agent.currentTool || '',
    }));

    return DEMO_AGENTS.map((demo, i) => ({
      key: `demo-${i}`,
      name: demo.name,
      color: getAgentColor(demo.type),
      activity: demo.activity,
      status: 'active' as const,
      tool: demo.tool,
    }));
  }, [activeAgents, showDemo]);

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
        const agent = agentsToRender[i];
        return (
          <Workstation
            key={i}
            position={slot.position}
            rotation={slot.rotation}
            status={agent ? agent.status : 'idle'}
            activity={agent ? agent.activity : 'idle'}
          />
        );
      })}

      {agentsToRender.map((agent, i) => {
        if (i >= WORKSTATION_SLOTS.length) return null;
        const slot = WORKSTATION_SLOTS[i];
        const avatarZ = slot.rotation === Math.PI ? slot.position[2] - 1 : slot.position[2] + 1;
        return (
          <AgentAvatar
            key={agent.key}
            name={agent.name}
            color={agent.color}
            position={[slot.position[0], slot.position[1], avatarZ]}
            activity={agent.activity}
          />
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
