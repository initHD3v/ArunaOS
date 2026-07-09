'use client';

import type { EventBus } from '@arunaos/services';
import type { NotificationType, Notification } from './notification-store';
import { useNotificationStore } from './notification-store';

let counter = 0;

export class NotificationService {
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  notify(
    type: NotificationType,
    message: string,
    options?: {
      duration?: number;
      action?: { label: string; handler: () => void };
      toast?: boolean;
    },
  ): string {
    const id = `notif-${++counter}-${Date.now()}`;
    const rawAction = options?.action;
    const action = rawAction
      ? {
          label: rawAction.label,
          handler: () => {
            rawAction.handler();
            this.bus.emit('notification:action', { id, type: rawAction.label });
          },
        }
      : undefined;
    const notification: Notification = {
      id,
      type,
      message,
      duration: options?.duration ?? (options?.toast ? 3000 : 5000),
      toast: options?.toast ?? false,
      createdAt: Date.now(),
      action,
    };

    useNotificationStore.getState().add(notification);
    this.bus.emit('notification:created', { id, type, message });

    if (notification.duration > 0) {
      setTimeout(() => {
        useNotificationStore.getState().dismiss(id);
        this.bus.emit('notification:dismissed', { id });
      }, notification.duration);
    }

    return id;
  }

  info(message: string, options?: { duration?: number; toast?: boolean }): string {
    return this.notify('info', message, options);
  }

  success(message: string, options?: { duration?: number; toast?: boolean }): string {
    return this.notify('success', message, options);
  }

  warning(message: string, options?: { duration?: number; toast?: boolean }): string {
    return this.notify('warning', message, options);
  }

  error(message: string, options?: { duration?: number; toast?: boolean }): string {
    return this.notify('error', message, options);
  }

  dismiss(id: string): void {
    useNotificationStore.getState().dismiss(id);
    this.bus.emit('notification:dismissed', { id });
  }

  dismissAll(): void {
    useNotificationStore.getState().dismissAll();
    this.bus.emit('notification:dismissed', { all: true });
  }

  getQueue(): Notification[] {
    return useNotificationStore.getState().queue;
  }

  onAction(callback: (notification: Notification) => void): () => void {
    return this.bus.on('notification:action', (payload: unknown) => {
      const { id } = payload as { id: string };
      const queue = useNotificationStore.getState().queue;
      const notif = queue.find((n) => n.id === id);
      if (notif) callback(notif);
    });
  }
}
