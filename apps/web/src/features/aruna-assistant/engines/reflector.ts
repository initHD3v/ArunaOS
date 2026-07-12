import type {
  DailyReflection,
  Memory,
  MemoryQuery,
  ProductivitySummary,
  ReflectorEngine,
  SystemContext,
  WeeklyReflection,
} from './types';

export class ReflectionEngine implements ReflectorEngine {
  name = 'reflector';

  async init() {}

  destroy() {}

  generateDailyReflection(
    ctx: SystemContext,
    memory: { recall: (q: MemoryQuery) => Memory[] },
  ): DailyReflection {
    const today = new Date().toISOString().slice(0, 10);
    const allRecent = memory.recall({ limit: 100 });

    const tasksCompleted = allRecent.filter(
      (m) => m.category === 'episodic' && m.content.toLowerCase().includes('completed'),
    ).length;

    const tasksCreated = allRecent.filter(
      (m) => m.category === 'short-term' && m.content.toLowerCase().includes('task'),
    ).length;

    const focusScore = Math.min(Math.round((tasksCompleted / Math.max(tasksCreated, 1)) * 10), 10);

    let summary: string;
    let message: string;

    if (tasksCompleted > 5) {
      summary = `Hari yang produktif. ${tasksCompleted} tugas berhasil diselesaikan.`;
      message = 'Kamu bekerja dengan sangat baik hari ini. Pertahankan momentum ini.';
    } else if (tasksCompleted > 2) {
      summary = `Kemajuan yang stabil. ${tasksCompleted} tugas selesai hari ini.`;
      message = 'Setiap langkah kecil adalah kemajuan. Teruskan.';
    } else if (tasksCompleted > 0) {
      summary = `${tasksCompleted} tugas selesai. Masih ada ${Math.max(tasksCreated - tasksCompleted, 0)} tertunda.`;
      message = 'Tidak apa-apa jika tidak semuanya selesai. Besok kita lanjutkan.';
    } else {
      summary = 'Belum ada tugas yang tercatat hari ini.';
      message = 'Kadang hari untuk eksplorasi juga penting.';
    }

    return {
      date: today,
      tasksCompleted,
      tasksPending: Math.max(tasksCreated - tasksCompleted, 0),
      emailsHandled: 0,
      activeWorkspaces:
        ctx.workspace.activeModules.length > 0 ? ctx.workspace.activeModules : ['main'],
      productiveHours: ctx.time.hour,
      focusScore,
      summary,
      message,
    };
  }

  generateWeeklyReflection(
    _ctx: SystemContext,
    memory: { recall: (q: MemoryQuery) => Memory[] },
  ): WeeklyReflection {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekMemories = memory.recall({
      since: weekStart.getTime(),
      limit: 200,
    });

    const completedTasks = weekMemories.filter(
      (m) => m.category === 'episodic' && m.content.toLowerCase().includes('completed'),
    ).length;

    const totalTasks = weekMemories.filter((m) => m.content.toLowerCase().includes('task')).length;

    const focusScore =
      totalTasks > 0 ? Math.min(Math.round((completedTasks / totalTasks) * 10), 10) : 5;

    const activeDays = new Set(
      weekMemories.map((m) => new Date(m.timestamp).toISOString().slice(0, 10)),
    ).size;

    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      totalActiveDays: activeDays,
      averageFocusScore: focusScore,
      topWorkspaces: [],
      totalTasksCompleted: completedTasks,
      reflection:
        completedTasks > 10
          ? `Minggu yang produktif! ${completedTasks} tugas selesai.`
          : `${completedTasks} tugas selesai minggu ini. ${totalTasks - completedTasks} masih tertunda.`,
    };
  }

  getCurrentStreak(): number {
    try {
      const raw = localStorage.getItem('arunaos-reflection-streak');
      if (!raw) return 0;
      const data = JSON.parse(raw) as { streak: number; lastDate: string };
      const last = data.lastDate;
      const today = new Date().toISOString().slice(0, 10);
      if (last === today) return data.streak;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      if (last === yStr) return data.streak;
      return 0;
    } catch {
      return 0;
    }
  }

  getProductivitySummary(
    ctx: SystemContext,
    memory: { recall: (q: MemoryQuery) => Memory[] },
  ): ProductivitySummary {
    const today = this.generateDailyReflection(ctx, memory);
    const weekly = this.generateWeeklyReflection(ctx, memory);
    const streak = this.getCurrentStreak();

    // Determine trend by comparing today vs weekly average
    const trend =
      today.focusScore >= weekly.averageFocusScore
        ? ('improving' as const)
        : today.focusScore < weekly.averageFocusScore - 2
          ? ('declining' as const)
          : ('stable' as const);

    return { today, weekly, streak, trend };
  }
}
