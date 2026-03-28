import type { StateCreator } from 'zustand';
import type { CameraMode } from '@/types/office-store';

export type { CameraMode } from '@/types/office-store';

/** Scene slice state and actions. */
export interface SceneSliceState {
  cameraMode: CameraMode;
  timeOfDay: number;
  setCameraMode: (mode: CameraMode) => void;
  setTimeOfDay: (time: number) => void;
}

/** Creates the scene slice with camera and time-of-day state. */
export const createSceneSlice: StateCreator<SceneSliceState, [], [], SceneSliceState> = (set) => ({
  cameraMode: 'orbit',
  timeOfDay: 0.5,

  setCameraMode: (mode: CameraMode) => {
    set({ cameraMode: mode });
  },

  setTimeOfDay: (time: number) => {
    set({ timeOfDay: time });
  },
});
