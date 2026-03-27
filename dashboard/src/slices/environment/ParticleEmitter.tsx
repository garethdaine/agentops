'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Types ──────────────────────────────────────────────────────────

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Particle {
  position: Vec3;
  velocity: Vec3;
  color: number;
  age: number;
  lifetime: number;
  opacity: number;
  scale: number;
  active: boolean;
}

export interface ParticlePool {
  capacity: number;
  activeCount: number;
  acquire: () => Particle | null;
  release: (particle: Particle) => void;
}

export interface ParticlePreset {
  color: number;
  count: number;
  lifetime: number;
  spread: number;
}

// ── Preset name enum ───────────────────────────────────────────────

export enum PresetName {
  Success = 'success',
  Failure = 'failure',
  Memory = 'memory',
}

// ── Constants ──────────────────────────────────────────────────────

export const POOL_SIZE = 100;

const GRAVITY = 2;

export const PRESETS: Record<PresetName, ParticlePreset> = {
  [PresetName.Success]: {
    color: 0x22c55e,
    count: 12,
    lifetime: 1.2,
    spread: 0.6,
  },
  [PresetName.Failure]: {
    color: 0xef4444,
    count: 8,
    lifetime: 1.0,
    spread: 0.4,
  },
  [PresetName.Memory]: {
    color: 0x8b5cf6,
    count: 6,
    lifetime: 2.0,
    spread: 0.3,
  },
};

// ── Pool factory ───────────────────────────────────────────────────

function createDefaultParticle(): Particle {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    color: 0xffffff,
    age: 0,
    lifetime: 1,
    opacity: 1,
    scale: 1,
    active: false,
  };
}

export function createParticlePool(): ParticlePool {
  const particles: Particle[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    particles.push(createDefaultParticle());
  }

  let activeCount = 0;

  return {
    capacity: POOL_SIZE,

    get activeCount() {
      return activeCount;
    },

    acquire(): Particle | null {
      for (const p of particles) {
        if (!p.active) {
          p.active = true;
          activeCount++;
          return p;
        }
      }
      return null;
    },

    release(particle: Particle): void {
      if (!particle.active) return;
      particle.active = false;
      particle.age = 0;
      particle.opacity = 1;
      particle.scale = 1;
      activeCount--;
    },
  };
}

// ── Emit ───────────────────────────────────────────────────────────

export function emitParticles(
  pool: ParticlePool,
  origin: Vec3,
  preset: ParticlePreset,
): Particle[] {
  const activated: Particle[] = [];

  for (let i = 0; i < preset.count; i++) {
    const p = pool.acquire();
    if (!p) break;

    initializeParticle(p, origin, preset);
    activated.push(p);
  }

  return activated;
}

function initializeParticle(
  p: Particle,
  origin: Vec3,
  preset: ParticlePreset,
): void {
  const spread = preset.spread;
  p.position.x = origin.x + (Math.random() - 0.5) * spread;
  p.position.y = origin.y;
  p.position.z = origin.z + (Math.random() - 0.5) * spread;

  p.velocity.x = (Math.random() - 0.5) * 2;
  p.velocity.y = 1.5 + Math.random() * 2;
  p.velocity.z = (Math.random() - 0.5) * 2;

  p.color = preset.color;
  p.lifetime = preset.lifetime;
  p.age = 0;
  p.opacity = 1;
  p.scale = 1;
}

// ── Update ─────────────────────────────────────────────────────────

export function updateParticles(
  active: Particle[],
  pool: ParticlePool,
  delta: number,
): void {
  for (let i = active.length - 1; i >= 0; i--) {
    const p = active[i];
    advanceParticle(p, delta);

    if (p.age >= p.lifetime) {
      pool.release(p);
      active.splice(i, 1);
    }
  }
}

function advanceParticle(p: Particle, delta: number): void {
  p.age += delta;
  p.velocity.y -= GRAVITY * delta;

  p.position.x += p.velocity.x * delta;
  p.position.y += p.velocity.y * delta;
  p.position.z += p.velocity.z * delta;

  const t = Math.min(p.age / p.lifetime, 1);
  p.opacity = 1 - t;
  p.scale = 1 - t * 0.5;
}

// ── React component ────────────────────────────────────────────────

const SPHERE_SEGMENTS = 4;
const PARTICLE_RADIUS = 0.04;

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export interface ParticleEmitterProps {
  activeParticles: Particle[];
  dirty: boolean;
  onFrameUpdate?: () => void;
}

export default function ParticleEmitter({
  activeParticles,
  dirty,
  onFrameUpdate,
}: ParticleEmitterProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(
    () => new THREE.SphereGeometry(PARTICLE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    [],
  );

  useFrame(() => {
    if (!meshRef.current || !dirty) return;
    syncInstances(meshRef.current, activeParticles);
    onFrameUpdate?.();
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, POOL_SIZE]}
      frustumCulled={false}
    >
      <meshStandardMaterial transparent />
    </instancedMesh>
  );
}

function syncInstances(
  mesh: THREE.InstancedMesh,
  particles: Particle[],
): void {
  for (let i = 0; i < POOL_SIZE; i++) {
    if (i < particles.length) {
      const p = particles[i];
      _dummy.position.set(p.position.x, p.position.y, p.position.z);
      _dummy.scale.setScalar(p.scale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
      _color.set(p.color);
      mesh.setColorAt(i, _color);
    } else {
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}
