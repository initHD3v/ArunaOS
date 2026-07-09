import { Logger } from '@arunaos/services';

let instance: Logger | null = null;

export function setLogger(logger: Logger): void {
  instance = logger;
}

export function getLogger(): Logger {
  if (!instance) {
    instance = new Logger(process.env.NODE_ENV === 'development');
  }
  return instance;
}
