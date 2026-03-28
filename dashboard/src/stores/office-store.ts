import { createStore } from 'zustand/vanilla';
import { createSceneSlice, type SceneSliceState } from '@/slices/scene/scene.slice';
import { createZonesSlice, type ZonesSliceState } from '@/slices/zones/zones.slice';
import { createAgentsSlice, type AgentsSliceState } from '@/slices/agents/agents.slice';
import { createEnvironmentSlice, type EnvironmentSliceState } from '@/slices/environment/environment.slice';
import { createSessionSlice, type SessionSliceState } from '@/slices/session/session.slice';
import { createControlSlice, type ControlSliceState } from '@/slices/control/control.slice';
import { createPanelsSlice, type PanelsSliceState } from '@/slices/panels/panels.slice';

/** Composed office store state combining all domain slices. */
export type OfficeStoreState =
  & SceneSliceState
  & ZonesSliceState
  & AgentsSliceState
  & EnvironmentSliceState
  & SessionSliceState
  & ControlSliceState
  & PanelsSliceState;

/** Unified office store composed from all domain slices. */
export const useOfficeStore = createStore<OfficeStoreState>((...args) => ({
  ...createSceneSlice(...args),
  ...createZonesSlice(...args),
  ...createAgentsSlice(...args),
  ...createEnvironmentSlice(...args),
  ...createSessionSlice(...args),
  ...createControlSlice(...args),
  ...createPanelsSlice(...args),
}));
