'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentActivity } from '@/types/agent';
import {
  resolveAnimationState,
  getIdleTransform,
  getTypingTransform,
  getReadingTransform,
} from '@/lib/avatar-animations';

/** Body geometry dimensions (REQ-035). */
export const AVATAR_BODY = { width: 0.6, height: 1.2, depth: 0.4 } as const;

/** Head geometry dimensions (REQ-035). */
export const AVATAR_HEAD = { radius: 0.25 } as const;

interface AgentAvatarProps {
  /** Display name for the nameplate. */
  name: string;
  /** Hex color for the avatar body. */
  color: string;
  /** World-space position [x, y, z]. */
  position: [number, number, number];
  /** Current activity driving the animation state. */
  activity: AgentActivity;
  /** Opacity for fade-out animation (REQ-040). 0-1 range. */
  opacity?: number;
}

/**
 * 3D agent avatar: stylized body (box), head (sphere), nameplate (Text).
 * Animations are driven by useFrame using pure transform functions from avatar-animations.ts.
 * REQ-035, REQ-037, REQ-038
 */
export default function AgentAvatar({
  name,
  color,
  position,
  activity,
  opacity = 1,
}: AgentAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();

  const bodyBaseY = 0.6;
  const headBaseY = 1.35;
  const armBaseY = 0.6;

  const transparent = opacity < 1;

  const animState = resolveAnimationState(activity);

  // Drive animations via useFrame (REQ-037)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (animState === 'idle') {
      const { bodyY, headY } = getIdleTransform(t);
      if (bodyRef.current) bodyRef.current.position.y = bodyBaseY + bodyY;
      if (headRef.current) headRef.current.position.y = headBaseY + headY;
      // Reset arm rotations for idle
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      if (headRef.current) {
        headRef.current.rotation.x = 0;
        headRef.current.rotation.y = 0;
      }
    } else if (animState === 'typing') {
      const transforms = getTypingTransform(t);
      if (leftArmRef.current) leftArmRef.current.rotation.x = transforms.leftArmRotationX;
      if (rightArmRef.current) rightArmRef.current.rotation.x = transforms.rightArmRotationX;
      if (headRef.current) headRef.current.rotation.x = transforms.headRotationX;
    } else if (animState === 'reading') {
      const transforms = getReadingTransform(t);
      if (headRef.current) {
        headRef.current.rotation.x = transforms.headRotationX;
        headRef.current.rotation.y = transforms.headRotationY;
      }
      // Reset arms for reading
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
    }

    invalidate();
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body (box) */}
      <mesh ref={bodyRef} position={[0, bodyBaseY, 0]} castShadow>
        <boxGeometry args={[AVATAR_BODY.width, AVATAR_BODY.height, AVATAR_BODY.depth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          metalness={0.1}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>

      {/* Head (sphere) */}
      <mesh ref={headRef} position={[0, headBaseY, 0]} castShadow>
        <sphereGeometry args={[AVATAR_HEAD.radius, 16, 12]} />
        <meshStandardMaterial
          color="#ddb892"
          roughness={0.8}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>

      {/* Left arm */}
      <mesh ref={leftArmRef} position={[-0.38, armBaseY, 0]} castShadow>
        <boxGeometry args={[0.1, 0.45, 0.1]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          metalness={0.1}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>

      {/* Right arm */}
      <mesh ref={rightArmRef} position={[0.38, armBaseY, 0]} castShadow>
        <boxGeometry args={[0.1, 0.45, 0.1]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          metalness={0.1}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>

      {/* Nameplate (drei Text above head) */}
      <Text
        position={[0, 1.75, 0]}
        fontSize={0.15}
        color="#e0e8ff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#0f1428"
      >
        {name}
      </Text>
    </group>
  );
}
