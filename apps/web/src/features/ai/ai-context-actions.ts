import type { ContextMenuItem } from '@/types';
import { useAIContextStore } from '@/stores/ai-context.store';

export function getAIContextActions(context: {
  label: string;
  type: 'file' | 'app' | 'folder' | 'text' | 'desktop';
}): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];
  const askAI = (prompt: string) => useAIContextStore.getState().askAI(prompt);

  items.push({
    id: 'ai-ask',
    label: `Ask AI about "${context.label}"`,
    action: () => askAI(`Tell me about "${context.label}"`),
  });

  if (context.type === 'file' || context.type === 'text') {
    items.push({
      id: 'ai-summarize',
      label: 'Summarize',
      action: () => askAI(`Summarize the file "${context.label}"`),
    });
    items.push({
      id: 'ai-explain',
      label: 'Explain',
      action: () => askAI(`Explain "${context.label}" in simple terms`),
    });
  }

  return items;
}
