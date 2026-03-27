'use client';

import { useDeferredValue } from 'react';
import { useStore } from 'zustand';
import { useOfficeStore } from '@/stores/office-store';
import type { Weather } from '@/types/office-store';
import type { DemoWeatherOverride } from '@/slices/environment/environment.slice';

/* ── Weather icon map ───────────────────────────────────────────── */

const WEATHER_ICONS: Record<Weather, string> = {
  clear: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  fog: '\uD83C\uDF2B\uFE0F',
  rain: '\uD83C\uDF27\uFE0F',
  snow: '\u2744\uFE0F',
  showers: '\uD83C\uDF26\uFE0F',
  thunderstorm: '\u26C8\uFE0F',
};

/** Demo toggle cycle order. */
const DEMO_CYCLE: (Weather | null)[] = [
  null, 'clear', 'rain', 'snow', 'thunderstorm',
];

/** Advance the demo weather override to the next state. */
function nextDemoOverride(current: DemoWeatherOverride): DemoWeatherOverride {
  const idx = DEMO_CYCLE.indexOf(current);
  return DEMO_CYCLE[(idx + 1) % DEMO_CYCLE.length];
}

/** Small UI badge showing current weather, temperature, and demo toggle. */
export default function WeatherIndicator() {
  const weather = useStore(useOfficeStore, (s) => s.weather);
  const weatherData = useStore(useOfficeStore, (s) => s.weatherData);
  const demoOverride = useStore(useOfficeStore, (s) => s.demoWeatherOverride);
  const setDemoOverride = useStore(useOfficeStore, (s) => s.setDemoWeatherOverride);

  const deferredWeather = useDeferredValue(weather);
  const deferredData = useDeferredValue(weatherData);

  const icon = WEATHER_ICONS[deferredWeather] ?? WEATHER_ICONS.clear;
  const temp = deferredData?.temperature;
  const wind = deferredData?.windSpeed;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'rgba(15, 20, 40, 0.85)',
        color: '#e0e8ff',
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: 13,
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 10,
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <span>{icon}</span>
      <span>{deferredWeather}</span>
      {temp != null && <span>{Math.round(temp)}&deg;C</span>}
      {wind != null && <span>{Math.round(wind)} km/h</span>}
      <button
        onClick={() => setDemoOverride(nextDemoOverride(demoOverride))}
        style={{
          background: demoOverride ? '#334' : 'transparent',
          border: '1px solid #445',
          color: '#e0e8ff',
          borderRadius: 4,
          padding: '2px 6px',
          cursor: 'pointer',
          fontSize: 11,
        }}
        title={demoOverride ? `Demo: ${demoOverride}` : 'Toggle demo weather'}
      >
        {demoOverride ? `demo:${demoOverride}` : 'demo'}
      </button>
    </div>
  );
}
