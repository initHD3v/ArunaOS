import { ArunaEngine } from '../system-ai-service';
import type { AgentAction } from '../engine/agent-pipeline';

export interface FeedbackEntry {
  actionType: string;
  actionPayload: string;
  helpful: boolean;
  timestamp: number;
}

export class FeedbackLoop {
  private engine: ArunaEngine;
  private feedback: FeedbackEntry[] = [];

  constructor(engine: ArunaEngine) {
    this.engine = engine;
  }

  start(): void {
    this.engine.onAction((action: AgentAction) => {
      this.feedback.push({
        actionType: action.type,
        actionPayload: action.payload,
        helpful: true,
        timestamp: Date.now(),
      });
    });
  }

  markHelpful(actionPayload: string): void {
    const entry = this.feedback.find((f) => f.actionPayload === actionPayload);
    if (entry) entry.helpful = true;
  }

  markNotHelpful(actionPayload: string): void {
    const entry = this.feedback.find((f) => f.actionPayload === actionPayload);
    if (entry) entry.helpful = false;
  }

  getPositiveRate(): number {
    if (this.feedback.length === 0) return 0;
    const positive = this.feedback.filter((f) => f.helpful).length;
    return positive / this.feedback.length;
  }

  getRecentFeedback(count = 10): FeedbackEntry[] {
    return this.feedback.slice(-count);
  }
}
