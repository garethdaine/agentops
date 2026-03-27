import type { StateCreator } from 'zustand';
import type { Weather } from '@/types/office-store';
import type { WeatherData } from '@/lib/weather-service';

export type { Weather } from '@/types/office-store';

/** Valid environment override values for manual time control. */
export type EnvOverride = 'day' | 'night' | null;

/** Demo weather override — null means use live API data. */
export type DemoWeatherOverride = Weather | null;

/** Environment slice state and actions. */
export interface EnvironmentSliceState {
  weather: Weather;
  weatherData: WeatherData | null;
  demoWeatherOverride: DemoWeatherOverride;
  dayFactor: number;
  envOverride: EnvOverride;
  setWeather: (weather: Weather) => void;
  setWeatherData: (data: WeatherData) => void;
  setDemoWeatherOverride: (override: DemoWeatherOverride) => void;
  setDayFactor: (factor: number) => void;
  setEnvOverride: (override: EnvOverride) => void;
}

/** Creates the environment slice with weather and day/night state. */
export const createEnvironmentSlice: StateCreator<EnvironmentSliceState, [], [], EnvironmentSliceState> = (set) => ({
  weather: 'clear',
  weatherData: null,
  demoWeatherOverride: null,
  dayFactor: 1,
  envOverride: null,

  setWeather: (weather: Weather) => {
    set({ weather });
  },

  setWeatherData: (data: WeatherData) => {
    set({ weatherData: data });
  },

  setDemoWeatherOverride: (override: DemoWeatherOverride) => {
    set({ demoWeatherOverride: override });
  },

  setDayFactor: (factor: number) => {
    set({ dayFactor: factor });
  },

  setEnvOverride: (override: EnvOverride) => {
    set({ envOverride: override });
  },
});
