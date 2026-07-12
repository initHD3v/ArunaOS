import { describe, it, expect } from 'vitest';
import { FeedbackLoop } from './feedback-loop';
import { ArunaEngine } from '../system-ai-service';

describe('FeedbackLoop', () => {
  it('starts without error', () => {
    const engine = new ArunaEngine();
    const loop = new FeedbackLoop(engine);
    loop.start();
    expect(loop.getPositiveRate()).toBe(0);
  });

  it('getRecentFeedback returns empty array when no feedback', () => {
    const engine = new ArunaEngine();
    const loop = new FeedbackLoop(engine);
    expect(loop.getRecentFeedback()).toEqual([]);
  });

  it('markHelpful and markNotHelpful work with no matching entry', () => {
    const engine = new ArunaEngine();
    const loop = new FeedbackLoop(engine);
    loop.markHelpful('nonexistent');
    loop.markNotHelpful('nonexistent');
    // no error = pass
  });
});
