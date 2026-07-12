export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  source: string;
  priority: NotificationPriority;
  timestamp: number;
  read: boolean;
}

export type NotificationListener = (notification: SystemNotification) => void;

export class NotificationHub {
  private notifications: SystemNotification[] = [];
  private listeners: NotificationListener[] = [];
  private maxStored = 100;

  push(notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>): SystemNotification {
    const n: SystemNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      read: false,
    };

    this.notifications.unshift(n);

    if (this.notifications.length > this.maxStored) {
      this.notifications = this.notifications.slice(0, this.maxStored);
    }

    for (const listener of this.listeners) {
      listener(n);
    }

    return n;
  }

  markRead(id: string): void {
    const n = this.notifications.find((x) => x.id === id);
    if (n) n.read = true;
  }

  markAllRead(): void {
    for (const n of this.notifications) {
      n.read = true;
    }
  }

  getAll(): SystemNotification[] {
    return [...this.notifications];
  }

  getUnread(): SystemNotification[] {
    return this.notifications.filter((n) => !n.read);
  }

  getByPriority(priority: NotificationPriority): SystemNotification[] {
    return this.notifications.filter((n) => n.priority === priority);
  }

  getUrgent(): SystemNotification[] {
    return this.notifications.filter((n) => n.priority === 'urgent');
  }

  clear(): void {
    this.notifications = [];
  }

  onNotification(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
