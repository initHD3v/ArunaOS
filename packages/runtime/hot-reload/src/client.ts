import type { HMRClientOptions, HMRReloadPayload, HMRConnectedPayload } from './types';

export class HotReloadClient {
  private options: Required<HMRClientOptions>;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(options: HMRClientOptions) {
    this.options = {
      url: options.url,
      onReload: options.onReload ?? (() => {}),
      onConnected: options.onConnected ?? (() => {}),
      onError: options.onError ?? (() => {}),
      reconnectDelay: options.reconnectDelay ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
    };
  }

  connect(): void {
    if (this.destroyed) return;
    this.disconnect();

    try {
      this.eventSource = new EventSource(this.options.url);

      this.eventSource.addEventListener('connected', (event: MessageEvent) => {
        const data: HMRConnectedPayload = JSON.parse(event.data);
        this.reconnectAttempts = 0;
        this.options.onConnected(data);
      });

      this.eventSource.addEventListener('hmr:reload', (event: MessageEvent) => {
        const data: HMRReloadPayload = JSON.parse(event.data);
        this.options.onReload(data);
        this.scheduleReconnect();
      });

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        this.scheduleReconnect();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.options.onError(error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.eventSource?.close();
    this.eventSource = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.disconnect();
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.options.onError(new Error('Max reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(
      () => {
        this.connect();
      },
      this.options.reconnectDelay * Math.min(this.reconnectAttempts, 5),
    );
  }
}
