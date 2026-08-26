import { describe, expect, it, vi } from 'vitest';
import { formatLocationName, getAccuratePosition } from './geolocation';

describe('formatLocationName', () => {
  it('formats hamlet + village + kecamatan', () => {
    const addr = { hamlet: 'Barung', village: 'Saribudolok', county: 'Silimakuta' };
    expect(formatLocationName(addr)).toBe('Barung, Saribudolok, Silimakuta');
  });

  it('skips duplicate specific/local values', () => {
    const addr = { hamlet: 'Pasar', village: 'Pasar' };
    expect(formatLocationName(addr)).toBe('Pasar');
  });

  it('falls back to county then state', () => {
    expect(formatLocationName({ county: 'Simalungun' })).toBe('Simalungun');
    expect(formatLocationName({ state: 'Sumatera Utara' })).toBe('Sumatera Utara');
  });

  it('returns null when nothing usable', () => {
    expect(formatLocationName(undefined)).toBeNull();
    expect(formatLocationName({})).toBeNull();
    expect(formatLocationName({ country: 'Indonesia' })).toBeNull();
  });
});

describe('getAccuratePosition', () => {
  function makeGeolocation(readings: Array<{ accuracy: number }>) {
    let call = 0;
    return {
      getCurrentPosition: (success: PositionCallback) => {
        const reading = readings[Math.min(call++, readings.length - 1)]!;
        success({
          coords: {
            latitude: 2.99,
            longitude: 98.61,
            heading: null,
            speed: null,
            altitude: null,
            altitudeAccuracy: null,
            ...reading,
            toJSON: () => ({}),
          } as GeolocationCoordinates,
          timestamp: Date.now(),
        } as GeolocationPosition);
      },
    };
  }

  it('keeps the fix with the smallest accuracy radius', async () => {
    vi.stubGlobal(
      'navigator',
      Object.create(navigator, {
        geolocation: {
          value: makeGeolocation([{ accuracy: 3000 }, { accuracy: 120 }, { accuracy: 25 }]),
        },
      }),
    );
    const fix = await getAccuratePosition({ attempts: 3 });
    expect(fix.accuracy).toBe(25);
  });

  it('stops early once a confident fix arrives', async () => {
    const geo = makeGeolocation([{ accuracy: 10 }, { accuracy: 9999 }]);
    vi.stubGlobal('navigator', Object.create(navigator, { geolocation: { value: geo } }));
    const spy = vi.spyOn(geo, 'getCurrentPosition');
    const fix = await getAccuratePosition({ attempts: 3 });
    expect(fix.accuracy).toBe(10);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('rejects immediately on permission denied', async () => {
    vi.stubGlobal(
      'navigator',
      Object.create(navigator, {
        geolocation: {
          value: {
            getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
              error({ code: 1, message: 'denied' } as GeolocationPositionError),
          },
        },
      }),
    );
    await expect(getAccuratePosition()).rejects.toMatchObject({ code: 1 });
  });
});
