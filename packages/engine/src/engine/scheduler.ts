export type CronSchedule =
  'every-hour' | 'every-30min' | 'every-15min' | 'daily-morning' | 'daily-midday' | 'daily-evening';

export interface ScheduledTask {
  id: string;
  schedule: CronSchedule;
  action: () => void | Promise<void>;
  lastRun: number;
}

export type SystemEvent =
  'app-opened' | 'app-closed' | 'task-completed' | 'notification' | 'focus-change';

export interface EventHandler {
  event: SystemEvent;
  handler: (data: unknown) => void | Promise<void>;
}

export class Scheduler {
  private tasks: ScheduledTask[] = [];
  private handlers: EventHandler[] = [];
  private intervalIds: ReturnType<typeof setInterval>[] = [];
  private timeoutIds: ReturnType<typeof setTimeout>[] = [];
  private running = false;

  registerTask(task: ScheduledTask): void {
    if (this.tasks.some((t) => t.id === task.id)) return;
    this.tasks.push(task);
    if (this.running) this.startTask(task);
  }

  on(event: SystemEvent, handler: (data: unknown) => void | Promise<void>): void {
    this.handlers.push({ event, handler });
  }

  off(event: SystemEvent, handler: (data: unknown) => void | Promise<void>): void {
    this.handlers = this.handlers.filter((h) => !(h.event === event && h.handler === handler));
  }

  emit(event: SystemEvent, data?: unknown): void {
    for (const h of this.handlers) {
      if (h.event === event) {
        Promise.resolve(h.handler(data)).catch((e) =>
          console.warn('[Scheduler] event handler failed:', e),
        );
      }
    }
  }

  start(): void {
    this.running = true;
    for (const task of this.tasks) {
      this.startTask(task);
    }
  }

  private startTask(task: ScheduledTask): void {
    const ms = this.getIntervalMs(task.schedule);
    if (ms <= 0) return;

    if (task.schedule.startsWith('daily-')) {
      this.scheduleDaily(task);
    } else {
      const id = setInterval(async () => {
        await task.action();
        task.lastRun = Date.now();
      }, ms);
      this.intervalIds.push(id);
    }
  }

  private scheduleDaily(task: ScheduledTask): void {
    const tick = async () => {
      await task.action();
      task.lastRun = Date.now();
      const next = this.getIntervalMs(task.schedule);
      if (next > 0) {
        const id = setTimeout(tick, next);
        this.timeoutIds.push(id);
      }
    };
    const delay = this.getIntervalMs(task.schedule);
    if (delay > 0) {
      const id = setTimeout(tick, delay);
      this.timeoutIds.push(id);
    }
  }

  private getIntervalMs(schedule: CronSchedule): number {
    switch (schedule) {
      case 'every-15min':
        return 15 * 60 * 1000;
      case 'every-30min':
        return 30 * 60 * 1000;
      case 'every-hour':
        return 60 * 60 * 1000;
      case 'daily-morning':
      case 'daily-midday':
      case 'daily-evening': {
        const hour = schedule === 'daily-morning' ? 6 : schedule === 'daily-midday' ? 12 : 18;
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
        if (now >= target) target.setDate(target.getDate() + 1);
        return target.getTime() - now.getTime();
      }
    }
  }

  stop(): void {
    this.running = false;
    for (const id of this.intervalIds) clearInterval(id);
    for (const id of this.timeoutIds) clearTimeout(id);
    this.intervalIds = [];
    this.timeoutIds = [];
  }
}
