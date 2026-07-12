'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArunaHomeStore } from '../stores/aruna-home.store';

export function TaskSummary() {
  const tasks = useArunaHomeStore((s) => s.tasks);
  const addTask = useArunaHomeStore((s) => s.addTask);
  const toggleTask = useArunaHomeStore((s) => s.toggleTask);
  const removeTask = useArunaHomeStore((s) => s.removeTask);
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    addTask(text);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ListTodo size={12} className="text-primary" />
          <span className="text-foreground text-[11px] font-medium">Tasks</span>
        </div>
        {total > 0 && (
          <span className="text-foreground/30 text-[9px]">
            {done}/{total}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tambah task..."
          className={cn(
            'min-w-0 flex-1 rounded-md px-2 py-1 text-[10px]',
            'bg-background/60 text-foreground',
            'border-border/20 focus:border-primary/30 border focus:outline-none',
            'placeholder:text-foreground/20',
          )}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className={cn(
            'flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] transition-colors',
            'bg-primary hover:bg-primary/90 text-white',
            'disabled:opacity-40',
          )}
        >
          <Plus size={10} />
        </button>
      </form>

      {tasks.length === 0 && (
        <p className="text-foreground/20 py-2 text-center text-[9px]">Belum ada task</p>
      )}

      <div className="max-h-32 space-y-0.5 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              'group flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors',
              'hover:bg-muted/50',
            )}
          >
            <button
              onClick={() => toggleTask(task.id)}
              className="text-foreground/30 hover:text-primary shrink-0 transition-colors"
            >
              {task.done ? (
                <CheckCircle2 size={10} className="text-success" />
              ) : (
                <Circle size={10} />
              )}
            </button>
            <span
              className={cn(
                'flex-1 text-[10px] transition-all',
                task.done ? 'text-foreground/30 line-through' : 'text-foreground/70',
              )}
            >
              {task.text}
            </span>
            <button
              onClick={() => removeTask(task.id)}
              className="text-foreground/20 hover:text-danger shrink-0 opacity-0 transition-all group-hover:opacity-100"
            >
              <Trash2 size={8} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
