'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OfficeFloor, OfficeWalls, OfficeLighting, OfficeDecorations, OfficeOutdoor } from '@/slices/scene';
import WallDecorations from '@/slices/scene/WallDecorations';
import { Workstation, ZoneFurniture } from '@/slices/zones';
import { ZONE_FURNITURE_MAP } from '@/lib/floorplan';
import FurnitureRenderer from '@/slices/zones/furniture/FurnitureRenderer';
import { AgentAvatar } from '@/slices/agents';
import DayNightCycle from '@/slices/environment/DayNightCycle';
import WeatherParticles from '@/slices/environment/WeatherParticles';
import ZoneLabels from '@/slices/zones/ZoneLabels';
import { WORKSTATION_SLOTS, ZONES } from '@/lib/floorplan';
import { FOG_CONFIG } from '@/lib/lighting-config';
import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { useOfficeStore } from '@/stores/office-store';
import { getAgentColor } from '@/lib/avatar-animations';
import { mapToolToActivity } from '@/lib/event-mapper';
import AgentDetailPanel from '@/slices/panels/AgentDetailPanel';
import ZoneDetailPanel from '@/slices/panels/ZoneDetailPanel';
import * as THREE from 'three';
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

const HIGHLIGHT_COLOR = new THREE.Color(0x4488ff);
const HIGHLIGHT_INTENSITY = 0.35;

/** Apply emissive highlight to all meshes in a group on hover. */
function applyEmissiveHighlight(group: THREE.Object3D, on: boolean) {
  group.traverse((child: THREE.Object3D) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mat = child.material as THREE.MeshStandardMaterial;
    if (!mat?.emissive) return;
    if (on) {
      if (!child.userData._savedEmissive) {
        child.userData._savedEmissive = mat.emissive.clone();
        child.userData._savedEmissiveIntensity = mat.emissiveIntensity ?? 0;
      }
      mat.emissive.copy(HIGHLIGHT_COLOR);
      mat.emissiveIntensity = HIGHLIGHT_INTENSITY;
    } else if (child.userData._savedEmissive) {
      mat.emissive.copy(child.userData._savedEmissive);
      mat.emissiveIntensity = child.userData._savedEmissiveIntensity ?? 0;
      delete child.userData._savedEmissive;
      delete child.userData._savedEmissiveIntensity;
    }
  });
}

function handlePointerOver(e: any) {
  e.stopPropagation();
  document.body.style.cursor = 'pointer';
  const group = e.eventObject;
  applyEmissiveHighlight(group, true);
}

function handlePointerOut(e: any) {
  e.stopPropagation();
  document.body.style.cursor = 'default';
  const group = e.eventObject;
  applyEmissiveHighlight(group, false);
}

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

  const [selectedZone, setSelectedZone] = useState<typeof ZONES[number] | null>(null);
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
  const setDetailPanelOpen = useStore(useOfficeStore, (s) => s.setDetailPanelOpen);
  const handleAvatarClick = useCallback((sessionId: string) => {
    setSelectedZone(null); // Close zone panel
    if (sessionId === selectedAgent) {
      clearSelection();
    } else {
      setSelectedAgent(sessionId);
      setDetailPanelOpen(true);
    }
  }, [selectedAgent, setSelectedAgent, clearSelection, setDetailPanelOpen]);

  const handleZoneClick = useCallback((zoneId: string) => {
    clearSelection(); // Close agent panel
    setDetailPanelOpen(false);
    const zone = ZONES.find((z) => z.id === zoneId);
    if (zone) {
      setSelectedZone(zone);
    }
  }, [clearSelection, setDetailPanelOpen]);

  return (
    <>
    <Canvas
      shadows
      camera={{ position: [20, 14, 20], fov: 50, near: 0.1, far: 500000 }}
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
      {/* Zone furniture with hover highlight and click-to-inspect */}
      <group name="zoneFurniture">
        {Object.entries(ZONE_FURNITURE_MAP).map(([zoneId, placements]) => (
          <group
            key={zoneId}
            onClick={(e) => { e.stopPropagation(); handleZoneClick(zoneId); }}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            {placements.map((placement, index) => (
              <FurnitureRenderer
                key={`${zoneId}-${placement.type}-${index}`}
                placement={placement}
              />
            ))}
          </group>
        ))}
      </group>
      <ZoneLabels />

      {WORKSTATION_SLOTS.map((slot, i) => {
        const agent = activeAgents[i];
        return (
          <group
            key={i}
            onClick={(e) => { e.stopPropagation(); handleZoneClick('workstations'); }}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <Workstation
              position={slot.position}
              rotation={slot.rotation}
              status={agent ? 'active' : 'idle'}
              activity={agent ? deriveActivity(agent) : 'idle'}
            />
          </group>
        );
      })}

      {activeAgents.map((agent, i) => {
        if (i >= WORKSTATION_SLOTS.length) return null;
        const slot = WORKSTATION_SLOTS[i];
        const avatarZ = slot.rotation === Math.PI ? slot.position[2] - 0.6 : slot.position[2] + 0.6;
        return (
          <group
            key={agent.session_id}
            onClick={(e) => { e.stopPropagation(); handleAvatarClick(agent.session_id); }}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <AgentAvatar
              name={agent.name || `Agent ${i + 1}`}
              color={getAgentColor(agent.type)}
              position={[slot.position[0], slot.position[1] + 0.25, avatarZ]}
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
    <ZoneDetailPanel
      zone={selectedZone}
      onClose={() => setSelectedZone(null)}
      agents={activeAgents.filter((a, i) => {
        if (!selectedZone || i >= WORKSTATION_SLOTS.length) return false;
        const slot = WORKSTATION_SLOTS[i];
        const zp = selectedZone.position;
        const zs = selectedZone.size;
        return (
          slot.position[0] >= zp.x - zs.width / 2 &&
          slot.position[0] <= zp.x + zs.width / 2 &&
          slot.position[2] >= zp.z - zs.depth / 2 &&
          slot.position[2] <= zp.z + zs.depth / 2
        );
      })}
    />
    </>
  );
}
