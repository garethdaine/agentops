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

  const WEATHER_LABELS: Record<string, string> = {
    clear: 'Clear', cloudy: 'Cloudy', fog: 'Fog', rain: 'Rain',
    snow: 'Snow', showers: 'Showers', thunderstorm: 'Thunderstorm',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 24,
        left: 24,
        background: 'rgba(15, 20, 35, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#e0e8ff',
        padding: '12px 16px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 10,
        pointerEvents: 'auto',
        userSelect: 'none',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          {temp != null && (
            <span style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(temp)}&deg;C
            </span>
          )}
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {WEATHER_LABELS[deferredWeather] || 'Clear'}
          </span>
        </div>
        {wind != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(156,163,175,0.7)' }}>
            <span>&#x1F4A8;</span>
            <span>{Math.round(wind)} km/h</span>
          </div>
        )}
      </div>
      <button
        onClick={() => setDemoOverride(nextDemoOverride(demoOverride))}
        style={{
          background: demoOverride ? 'rgba(51,51,68,0.6)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#9ca3af',
          borderRadius: 6,
          padding: '3px 8px',
          cursor: 'pointer',
          fontSize: 10,
          marginLeft: 4,
        }}
        title={demoOverride ? `Demo: ${demoOverride}` : 'Toggle demo weather'}
      >
        {demoOverride ? `demo:${demoOverride}` : 'demo'}
      </button>
    </div>
  );
}
