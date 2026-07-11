import type {
  RegistryModuleInfo,
  RegistrySearchParams,
  RegistrySearchResult,
  RegistryManifestResponse,
  UpdateCheckResult,
} from './types';
import type { IRegistryStore } from './store';

export class RegistryStore {
  private _store: IRegistryStore | null = null;

  private async init(): Promise<IRegistryStore> {
    if (!this._store) {
      const { getRegistryStore } = await import('./store');
      this._store = await getRegistryStore();
    }
    return this._store;
  }

  async search(params: RegistrySearchParams): Promise<RegistrySearchResult> {
    return (await this.init()).search(params);
  }

  async getModule(id: string): Promise<RegistryModuleInfo | undefined> {
    return (await this.init()).getModule(id);
  }

  async getManifest(id: string): Promise<RegistryManifestResponse | undefined> {
    return (await this.init()).getManifest(id);
  }

  async getCategories(): Promise<string[]> {
    return (await this.init()).getCategories();
  }

  async checkUpdates(
    updates: Array<{ id: string; version: string }>,
  ): Promise<UpdateCheckResult[]> {
    return (await this.init()).checkUpdates(updates);
  }
}
