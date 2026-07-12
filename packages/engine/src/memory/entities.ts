export interface UserProfile {
  id: string;
  name: string;
  createdAt: number;
  preferences: {
    language: string;
    proactiveMode: 'passive' | 'balanced' | 'active';
    theme: 'light' | 'dark' | 'system';
  };
}

export interface SessionRecord {
  id: string;
  date: string;
  startTime: number;
  endTime?: number;
  greetingShown: boolean;
  tasksCompleted: number;
  mood: string | null;
}

export interface AppUsageRecord {
  appId: string;
  date: string;
  openCount: number;
  totalDurationMs: number;
  lastOpened: number;
}

export interface TaskRecord {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: number;
  completedAt?: number;
}

export interface ConversationRecord {
  id: string;
  date: string;
  timestamp: number;
  messageCount: number;
  summary: string;
}

export interface MemoryGraph {
  user: UserProfile;
  sessions: SessionRecord[];
  appUsage: AppUsageRecord[];
  conversations: ConversationRecord[];
}
