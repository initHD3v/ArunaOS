export type CronSchedule =
  'every-hour' | 'every-30min' | 'every-15min' | 'daily-morning' | 'daily-evening';

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
  private intervals: ReturnType<typeof setInterval>[] = [];
  private running = false;

  registerTask(task: ScheduledTask): void {
    this.tasks.push(task);
    if (this.running) this.startTask(task);
  }

  on(event: SystemEvent, handler: (data: unknown) => void | Promise<void>): void {
    this.handlers.push({ event, handler });
  }

  emit(event: SystemEvent, data?: unknown): void {
    for (const h of this.handlers) {
      if (h.event === event) {
        h.handler(data);
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

    const id = setInterval(async () => {
      await task.action();
      task.lastRun = Date.now();
    }, ms);

    this.intervals.push(id);
  }

  private getIntervalMs(schedule: CronSchedule): number {
    switch (schedule) {
      case 'every-15min':
        return 15 * 60 * 1000;
      case 'every-30min':
        return 30 * 60 * 1000;
      case 'every-hour':
        return 60 * 60 * 1000;
      case 'daily-morning': {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
        if (now > target) target.setDate(target.getDate() + 1);
        return target.getTime() - now.getTime();
      }
      case 'daily-evening': {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
        if (now > target) target.setDate(target.getDate() + 1);
        return target.getTime() - now.getTime();
      }
    }
  }

  stop(): void {
    this.running = false;
    for (const id of this.intervals) {
      clearInterval(id);
    }
    this.intervals = [];
  }
}
