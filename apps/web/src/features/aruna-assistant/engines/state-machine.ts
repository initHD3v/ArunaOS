import type { AssistantState, StateMachineEngine, StateTransition } from './types';

const VALID_TRANSITIONS: Record<AssistantState, AssistantState[]> = {
  idle: ['observing', 'sleeping', 'listening'],
  observing: ['idle', 'thinking', 'sleeping', 'listening'],
  thinking: ['planning', 'speaking', 'observing', 'idle'],
  planning: ['executing', 'observing', 'idle'],
  executing: ['observing', 'speaking', 'idle', 'planning'],
  speaking: ['idle', 'listening', 'observing'],
  listening: ['thinking', 'idle', 'observing'],
  sleeping: ['idle', 'observing'],
};

export class AssistantStateMachine implements StateMachineEngine {
  name = 'state-machine';

  private _current: AssistantState = 'idle';
  private _history: StateTransition[] = [];
  private listeners: Array<(from: AssistantState, to: AssistantState, reason: string) => void> = [];

  async init() {
    this._current = 'observing';
    this._history.push({
      from: 'idle',
      to: 'observing',
      reason: 'System initialized',
      timestamp: Date.now(),
    });
  }

  destroy() {
    this.listeners = [];
    this._history = [];
  }

  get current(): AssistantState {
    return this._current;
  }

  get history(): StateTransition[] {
    return [...this._history];
  }

  canTransition(to: AssistantState): boolean {
    const allowed = VALID_TRANSITIONS[this._current];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  async transition(to: AssistantState, reason: string): Promise<boolean> {
    if (!this.canTransition(to)) return false;

    const from = this._current;
    this._current = to;
    this._history.push({ from, to, reason, timestamp: Date.now() });

    this.listeners.forEach((fn) => fn(from, to, reason));
    return true;
  }

  onStateChange(
    fn: (from: AssistantState, to: AssistantState, reason: string) => void,
  ): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  reset() {
    const from = this._current;
    this._current = 'idle';
    this._history = [];
    this._history.push({ from, to: 'idle', reason: 'Reset', timestamp: Date.now() });
  }
}
