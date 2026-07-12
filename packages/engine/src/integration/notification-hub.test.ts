import { describe, it, expect } from 'vitest';
import { NotificationHub } from './notification-hub';

describe('NotificationHub', () => {
  it('push adds a notification', () => {
    const hub = new NotificationHub();
    const n = hub.push({ title: 'Test', body: 'Hello', source: 'system', priority: 'normal' });
    expect(n.id).toBeTruthy();
    expect(n.read).toBe(false);
  });

  it('getAll returns all notifications', () => {
    const hub = new NotificationHub();
    hub.push({ title: 'A', body: 'a', source: 's', priority: 'low' });
    hub.push({ title: 'B', body: 'b', source: 's', priority: 'high' });
    expect(hub.getAll()).toHaveLength(2);
  });

  it('getUnread filters read notifications', () => {
    const hub = new NotificationHub();
    hub.push({ title: 'A', body: 'a', source: 's', priority: 'low' });
    const n = hub.push({ title: 'B', body: 'b', source: 's', priority: 'high' });
    hub.markRead(n.id);
    expect(hub.getUnread()).toHaveLength(1);
  });

  it('markAllRead marks everything read', () => {
    const hub = new NotificationHub();
    hub.push({ title: 'A', body: 'a', source: 's', priority: 'low' });
    hub.push({ title: 'B', body: 'b', source: 's', priority: 'high' });
    hub.markAllRead();
    expect(hub.getUnread()).toHaveLength(0);
  });

  it('getUrgent returns urgent notifications', () => {
    const hub = new NotificationHub();
    hub.push({ title: 'A', body: 'a', source: 's', priority: 'urgent' });
    hub.push({ title: 'B', body: 'b', source: 's', priority: 'low' });
    expect(hub.getUrgent()).toHaveLength(1);
  });

  it('clear removes all', () => {
    const hub = new NotificationHub();
    hub.push({ title: 'A', body: 'a', source: 's', priority: 'normal' });
    hub.clear();
    expect(hub.getAll()).toHaveLength(0);
  });

  it('onNotification listener is called', () => {
    const hub = new NotificationHub();
    let called = false;
    hub.onNotification(() => {
      called = true;
    });
    hub.push({ title: 'A', body: 'a', source: 's', priority: 'normal' });
    expect(called).toBe(true);
  });
});
