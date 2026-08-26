export interface GeoFix {
  lat: number;
  lon: number;
  accuracy: number;
}

const EARLY_STOP_ACCURACY_M = 50;
const ATTEMPT_DELAY_MS = 600;

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Take multiple high-accuracy GPS fixes and keep the most precise one.
 * Desktop browsers locate via WiFi/IP triangulation which is often off by
 * several kilometers; a single `getCurrentPosition` call frequently returns
 * the first (worst) estimate. Comparing `coords.accuracy` across attempts
 * and stopping early on a confident fix materially improves placement.
 */
export async function getAccuratePosition(options?: {
  attempts?: number;
  timeoutMs?: number;
}): Promise<GeoFix> {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const timeoutMs = options?.timeoutMs ?? 10000;

  let best: GeoFix | null = null;
  let lastError: GeolocationPositionError | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const pos = await getPosition({
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      });
      const fix: GeoFix = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      if (!best || fix.accuracy < best.accuracy) best = fix;
      if (best.accuracy <= EARLY_STOP_ACCURACY_M) break;
    } catch (err: unknown) {
      lastError = err as GeolocationPositionError;
      // Permission denied will never improve by retrying — bail out.
      if (lastError?.code === 1) break;
    }
    if (i < attempts - 1) await sleep(ATTEMPT_DELAY_MS);
  }

  if (best) return best;
  throw lastError ?? ({ code: 2, message: 'Posisi tidak tersedia' } as GeolocationPositionError);
}

/**
 * Human-readable place name from a Nominatim `address` object, ordered
 * hamlet/desa/kecamatan — e.g. "Saribudolok, Silimakuta" or
 * "Simpang Hinalang, Purba Sipinggan, Simalungun".
 */
export function formatLocationName(addr: Record<string, string> | undefined): string | null {
  if (!addr) return null;

  const specific = addr.hamlet || addr.suburb || addr.neighbourhood || addr.isolated_dwelling || '';
  const local = addr.village || addr.town || addr.city || '';
  const county = addr.county || addr.state_district || '';
  const state = addr.state || '';

  if (!specific && !local && !county && !state) return null;

  const parts = [
    specific && specific !== local ? specific : null,
    local || null,
    county || null,
  ].filter((p): p is string => !!p);

  if (parts.length === 0) return state || null;
  return parts.join(', ');
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=id`,
      {
        headers: { 'User-Agent': 'arunaOS/1.0' },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };
    const result = formatLocationName(data.address);
    if (result) return result;
    if (data.display_name) return data.display_name.split(', ').slice(0, 2).join(', ');
    return null;
  } catch {
    return null;
  }
}
