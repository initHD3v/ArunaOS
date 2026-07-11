export interface CreateModuleOptions {
  name: string;
  dir?: string;
  description?: string;
  permissions?: string[];
}

export interface DevServerOptions {
  dir: string;
  port?: number;
  host?: string;
}

export interface PublishOptions {
  dir?: string;
  registry?: string;
  apiKey?: string;
  dryRun?: boolean;
}

export interface PublishResult {
  success: boolean;
  moduleId: string;
  version: string;
  url?: string;
  error?: string;
}
