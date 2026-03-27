import type { StateCreator } from 'zustand';
import type { Weather } from '@/types/office-store';

export type { Weather } from '@/types/office-store';

/** Valid environment override values for manual time control. */
export type EnvOverride = 'day' | 'night' | null;

/** Environment slice state and actions. */
export interface EnvironmentSliceState {
  weather: Weather;
  dayFactor: number;
  envOverride: EnvOverride;
  setWeather: (weather: Weather) => void;
  setDayFactor: (factor: number) => void;
  setEnvOverride: (override: EnvOverride) => void;
}

/** Creates the environment slice with weather and day/night state. */
export const createEnvironmentSlice: StateCreator<EnvironmentSliceState, [], [], EnvironmentSliceState> = (set) => ({
  weather: 'clear',
  dayFactor: 1,
  envOverride: null,

  setWeather: (weather: Weather) => {
    set({ weather });
  },

  setDayFactor: (factor: number) => {
    set({ dayFactor: factor });
  },

  setEnvOverride: (override: EnvOverride) => {
    set({ envOverride: override });
  },
});
