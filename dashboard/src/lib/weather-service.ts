import type { Weather } from '@/types/office-store';

/** London fallback coordinates for weather API. */
export const DEFAULT_LOCATION = { lat: 51.5074, lon: -0.1278 };

/** Weather polling interval: 10 minutes. */
export const POLL_INTERVAL = 600_000;

/** Half-widths of the office building for indoor/outdoor checks. */
export const OFFICE_HALF_W = 14.5;
export const OFFICE_HALF_D = 11.5;

/** Weather data returned from the Open-Meteo API. */
export interface WeatherData {
  weatherCode: number;
  isDay: boolean;
  temperature: number;
  windSpeed: number;
}

/** Check whether a world-space x/z position falls inside the office bounds. */
export function isInsideOffice(x: number, z: number): boolean {
  return Math.abs(x) < OFFICE_HALF_W && Math.abs(z) < OFFICE_HALF_D;
}

/** Generate a random outdoor position (guaranteed outside office bounds). */
export function randomOutdoorPosition(): { x: number; z: number } {
  let x: number;
  let z: number;
  do {
    x = (Math.random() - 0.5) * 80;
    z = (Math.random() - 0.5) * 80;
  } while (isInsideOffice(x, z));
  return { x, z };
}

/** Classify a WMO weather code into a weather category string. */
export function classifyWeather(code: number): Weather {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code >= 4 && code <= 48) return 'fog';
  if (code >= 49 && code <= 67) return 'rain';
  if (code >= 68 && code <= 77) return 'snow';
  if (code >= 78 && code <= 86) return 'showers';
  if (code >= 87 && code <= 99) return 'thunderstorm';
  return 'clear';
}

/** Fetch current weather from the Open-Meteo API. Returns null on failure. */
export async function fetchWeather(
  lat: number,
  lon: number,
): Promise<WeatherData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,is_day,wind_speed_10m`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    return {
      weatherCode: c.weather_code,
      isDay: c.is_day === 1,
      temperature: c.temperature_2m,
      windSpeed: c.wind_speed_10m,
    };
  } catch {
    return null;
  }
}

/** Attempt browser geolocation, falling back to London. */
export function getLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve(DEFAULT_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(DEFAULT_LOCATION),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  });
}

/** Start polling weather every 10 minutes. Returns a cleanup function. */
export function startWeatherPolling(
  callback: (data: WeatherData) => void,
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  let location: { lat: number; lon: number } | null = null;

  async function poll(): Promise<void> {
    if (!location) location = await getLocation();
    const weather = await fetchWeather(location.lat, location.lon);
    if (weather) callback(weather);
  }

  poll();
  timer = setInterval(poll, POLL_INTERVAL);

  return () => {
    if (timer) clearInterval(timer);
  };
}
