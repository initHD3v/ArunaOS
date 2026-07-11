export interface HMRMessage {
  event: 'hmr:reload' | 'hmr:connected' | 'hmr:update' | 'hmr:error';
  data: Record<string, unknown>;
}

export interface HMRReloadPayload {
  timestamp: number;
  moduleId?: string;
}

export interface HMRConnectedPayload {
  clientId: number;
}

export interface HMRUpdatePayload {
  moduleId: string;
  version: string;
}

export type HMRHandler = (data: Record<string, unknown>) => void;

export interface HMRClientOptions {
  url: string;
  onReload?: (payload: HMRReloadPayload) => void;
  onConnected?: (payload: HMRConnectedPayload) => void;
  onError?: (error: Error) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}
