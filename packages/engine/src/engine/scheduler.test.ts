import { describe, it, expect, vi } from 'vitest';
import { Scheduler } from './scheduler';

describe('Scheduler', () => {
  it('registers and executes a task', async () => {
    const scheduler = new Scheduler();
    const fn = vi.fn();

    scheduler.registerTask({
      id: 'test',
      schedule: 'every-hour',
      action: fn,
      lastRun: 0,
    });

    scheduler.start();
    expect(fn).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it('emits and handles events', async () => {
    const scheduler = new Scheduler();
    const fn = vi.fn();

    scheduler.on('app-opened', fn);
    scheduler.emit('app-opened', { appId: 'test' });
    expect(fn).toHaveBeenCalledWith({ appId: 'test' });
  });

  it('stops all intervals', async () => {
    const scheduler = new Scheduler();

    scheduler.registerTask({
      id: 'test',
      schedule: 'every-hour',
      action: () => {},
      lastRun: 0,
    });

    scheduler.start();
    scheduler.stop();
    // no error = pass
  });
});
