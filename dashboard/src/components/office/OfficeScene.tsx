'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OfficeFloor, OfficeWalls, OfficeLighting, OfficeDecorations, OfficeOutdoor } from '@/slices/scene';
import WallDecorations from '@/slices/scene/WallDecorations';
import { Workstation, ZoneFurniture } from '@/slices/zones';
import { AgentAvatar } from '@/slices/agents';
import DayNightCycle from '@/slices/environment/DayNightCycle';
import WeatherParticles from '@/slices/environment/WeatherParticles';
import ZoneLabels from '@/slices/zones/ZoneLabels';
import { WORKSTATION_SLOTS } from '@/lib/floorplan';
import { FOG_CONFIG } from '@/lib/lighting-config';
import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { useOfficeStore } from '@/stores/office-store';
import { getAgentColor } from '@/lib/avatar-animations';
import { mapToolToActivity } from '@/lib/event-mapper';
import AgentDetailPanel from '@/slices/panels/AgentDetailPanel';
import { processWASD, shouldIgnoreInput } from '@/hooks/useWASDCamera';
import ParticleEmitter, {
  createParticlePool,
  emitParticles,
  updateParticles,
  PRESETS,
  PresetName,
  type Particle,
  type ParticlePool,
} from '@/slices/environment/ParticleEmitter';
import { createBubbleManager, type BubbleManager } from '@/slices/agents/SpeechBubble';
import { createSpeechBubblePool } from '@/lib/canvas-texture-pool';
import type { AgentState as StoreAgentState } from '@/stores/agent-store';
import type { AgentActivity } from '@/types/agent';

const IDLE_PHRASES = ['Thinking...', 'Hmm...', 'Pondering...', 'Considering...'];

const INACTIVITY_TIMEOUT_MS = 60_000;

/** WASD camera controller - must be a child of Canvas to access useFrame/useThree. */
function WASDCameraController({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree();
  const keysDown = useRef(new Set<string>());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreInput(e.target as Element)) return;
      keysDown.current.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (controlsRef.current) {
      processWASD(keysDown.current, camera, controlsRef.current, delta);
    }
  });

  return null;
}

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

  const controlsRef = useRef<any>(null);
  const poolRef = useRef<ParticlePool>(createParticlePool());
  const activeParticlesRef = useRef<Particle[]>([]);
  const dirtyRef = useRef(false);
  const bubbleManagerRef = useRef<BubbleManager | null>(null);
  const prevToolsRef = useRef<Map<string, string | null>>(new Map());

  // Initialize bubble manager
  useEffect(() => {
    const pool = createSpeechBubblePool();
    bubbleManagerRef.current = createBubbleManager(pool);
    return () => {
      bubbleManagerRef.current?.dispose();
      pool.dispose();
    };
  }, []);

  // Wire speech bubbles to agent activity changes
  useEffect(() => {
    if (!bubbleManagerRef.current) return;
    const bm = bubbleManagerRef.current;

    for (const agent of activeAgents) {
      const prevTool = prevToolsRef.current.get(agent.session_id);
      const currentTool = agent.currentTool ?? null;

      if (currentTool && currentTool !== prevTool) {
        // Show tool name on tool_use events
        bm.show(agent.session_id, currentTool, { thought: false, duration: 3 });
      } else if (!currentTool && prevTool) {
        // Show thinking phrase on idle
        const phrase = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)];
        bm.show(agent.session_id, phrase, { thought: true, duration: 4 });
      }

      prevToolsRef.current.set(agent.session_id, currentTool);
    }
  }, [activeAgents]);

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

      <DayNightCycle />
      <WeatherParticles />
      <OfficeLighting />
      <OfficeFloor />
      <OfficeWalls />
      <OfficeDecorations />
      <OfficeOutdoor />
      <WallDecorations />
      <ZoneFurniture />
      <ZoneLabels />

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

      <ParticleEmitter
        activeParticles={activeParticlesRef.current}
        dirty={dirtyRef.current}
        onFrameUpdate={() => { dirtyRef.current = false; }}
      />

      <WASDCameraController controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
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
