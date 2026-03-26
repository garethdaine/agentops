import type { StateCreator } from 'zustand';
import type { Weather } from '@/types/office-store';

export type { Weather } from '@/types/office-store';

/** Environment slice state and actions. */
export interface EnvironmentSliceState {
  weather: Weather;
  dayFactor: number;
  setWeather: (weather: Weather) => void;
  setDayFactor: (factor: number) => void;
}

/** Creates the environment slice with weather and day/night state. */
export const createEnvironmentSlice: StateCreator<EnvironmentSliceState, [], [], EnvironmentSliceState> = (set) => ({
  weather: 'clear',
  dayFactor: 1,

  setWeather: (weather: Weather) => {
    set({ weather });
  },

  setDayFactor: (factor: number) => {
    set({ dayFactor: factor });
  },
});
