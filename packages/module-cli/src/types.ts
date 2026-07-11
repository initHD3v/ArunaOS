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
