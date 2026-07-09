'use client';

import type { EventBus, Logger } from '@arunaos/services';

export class LifecycleService {
  private bus: EventBus;
  private logger: Logger;
  private sleepHandlers: (() => void)[] = [];
  private resumeHandlers: (() => void)[] = [];
  private shutdownHandlers: (() => void)[] = [];

  constructor(bus: EventBus, logger: Logger) {
    this.bus = bus;
    this.logger = logger;
  }

  init(): void {
    this.bus.on('app:sleep', () => {
      this.logger.info('LifecycleService', 'App sleeping');
      this.sleepHandlers.forEach((h) => h());
    });
    this.bus.on('app:resume', () => {
      this.logger.info('LifecycleService', 'App resumed');
      this.resumeHandlers.forEach((h) => h());
    });
    this.bus.on('app:shutdown', () => {
      this.logger.info('LifecycleService', 'App shutting down');
      this.shutdownHandlers.forEach((h) => h());
    });
    this.logger.info('LifecycleService', 'Lifecycle service initialized');
  }

  onSleep(handler: () => void): () => void {
    this.sleepHandlers.push(handler);
    return () => {
      this.sleepHandlers = this.sleepHandlers.filter((h) => h !== handler);
    };
  }

  onResume(handler: () => void): () => void {
    this.resumeHandlers.push(handler);
    return () => {
      this.resumeHandlers = this.resumeHandlers.filter((h) => h !== handler);
    };
  }

  onShutdown(handler: () => void): () => void {
    this.shutdownHandlers.push(handler);
    return () => {
      this.shutdownHandlers = this.shutdownHandlers.filter((h) => h !== handler);
    };
  }

  sleep(): void {
    this.bus.emit('app:sleep', { timestamp: Date.now() });
  }

  resume(): void {
    this.bus.emit('app:resume', { timestamp: Date.now() });
  }

  shutdown(): void {
    this.bus.emit('app:shutdown', { timestamp: Date.now() });
  }
}
