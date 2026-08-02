import { IndexedDBAdapter } from '@arunaos/services';

/** Key under the wallpaper image is held in IndexedDB. */
export const WALLPAPER_IMAGE_KEY = 'wallpaper:image';

/**
 * Marker stored in `WallpaperConfig.imagePath`. The actual image bytes live in
 * IndexedDB so large uploads never overflow the localStorage quota that backs
 * `arunaos_settings`. Consumers resolve this marker to the real data URL.
 */
export const WALLPAPER_MARKER = 'storage:wallpaper:image';

class WallpaperImageStore {
  private readonly adapter = new IndexedDBAdapter('arunaos', 'wallpapers');

  async save(dataUrl: string): Promise<void> {
    try {
      await this.adapter.set(WALLPAPER_IMAGE_KEY, dataUrl);
    } catch {
      /* non-fatal: wallpaper just won't persist this time */
    }
  }

  async get(): Promise<string | null> {
    try {
      return await this.adapter.get<string>(WALLPAPER_IMAGE_KEY);
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.adapter.delete(WALLPAPER_IMAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  isMarker(imagePath: string): boolean {
    return imagePath === WALLPAPER_MARKER;
  }

  /**
   * Resolve a persisted `imagePath` into a renderable image URL. Handles both
   * the IndexedDB marker and legacy inline `data:` URLs.
   */
  async resolveUrl(imagePath: string | undefined): Promise<string | null> {
    if (!imagePath) return null;
    if (this.isMarker(imagePath)) return this.get();
    if (imagePath.startsWith('data:') || imagePath.startsWith('blob:')) return imagePath;
    return null;
  }
}

export const wallpaperImageStore = new WallpaperImageStore();
