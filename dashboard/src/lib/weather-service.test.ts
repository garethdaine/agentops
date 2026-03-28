import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  classifyWeather,
  fetchWeather,
  DEFAULT_LOCATION,
  isInsideOffice,
  OFFICE_HALF_W,
  OFFICE_HALF_D,
} from './weather-service';

describe('classifyWeather', () => {
  it('should return "clear" for code 0', () => {
    expect(classifyWeather(0)).toBe('clear');
  });

  it('should return "cloudy" for codes 1-3', () => {
    expect(classifyWeather(1)).toBe('cloudy');
    expect(classifyWeather(3)).toBe('cloudy');
  });

  it('should return "fog" for codes 4-48', () => {
    expect(classifyWeather(4)).toBe('fog');
    expect(classifyWeather(48)).toBe('fog');
  });

  it('should return "rain" for codes 49-67', () => {
    expect(classifyWeather(49)).toBe('rain');
    expect(classifyWeather(67)).toBe('rain');
  });

  it('should return "snow" for codes 68-77', () => {
    expect(classifyWeather(68)).toBe('snow');
    expect(classifyWeather(77)).toBe('snow');
  });

  it('should return "showers" for codes 78-86', () => {
    expect(classifyWeather(78)).toBe('showers');
    expect(classifyWeather(86)).toBe('showers');
  });

  it('should return "thunderstorm" for codes 87-99', () => {
    expect(classifyWeather(87)).toBe('thunderstorm');
    expect(classifyWeather(99)).toBe('thunderstorm');
  });

  it('should return "clear" for unknown codes', () => {
    expect(classifyWeather(100)).toBe('clear');
    expect(classifyWeather(-1)).toBe('clear');
  });
});

describe('DEFAULT_LOCATION', () => {
  it('should be London coordinates', () => {
    expect(DEFAULT_LOCATION.lat).toBeCloseTo(51.5074, 2);
    expect(DEFAULT_LOCATION.lon).toBeCloseTo(-0.1278, 2);
  });
});

describe('fetchWeather', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call Open-Meteo API with lat/lon', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        current: {
          weather_code: 0,
          is_day: 1,
          temperature_2m: 15,
          wind_speed_10m: 5,
        },
      }),
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const result = await fetchWeather(51.5, -0.1);
    expect(fetch).toHaveBeenCalledOnce();
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('api.open-meteo.com');
    expect(url).toContain('latitude=51.5');
    expect(url).toContain('longitude=-0.1');
    expect(result).toEqual({
      weatherCode: 0,
      isDay: true,
      temperature: 15,
      windSpeed: 5,
    });
  });

  it('should return null on API failure', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    const result = await fetchWeather(51.5, -0.1);
    expect(result).toBeNull();
  });

  it('should return null on network error', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    const result = await fetchWeather(51.5, -0.1);
    expect(result).toBeNull();
  });
});

describe('isInsideOffice', () => {
  it('should return true for origin (center of office)', () => {
    expect(isInsideOffice(0, 0)).toBe(true);
  });

  it('should return false for positions outside office bounds', () => {
    expect(isInsideOffice(OFFICE_HALF_W + 1, 0)).toBe(false);
    expect(isInsideOffice(0, OFFICE_HALF_D + 1)).toBe(false);
  });

  it('should return false for positions at the edge', () => {
    expect(isInsideOffice(OFFICE_HALF_W, 0)).toBe(false);
  });
});
