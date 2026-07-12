'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useService } from '@/providers/service-provider';
import type { ModuleRegistry, ModuleLoader, ModuleStore } from '@arunaos/runtime';
import { ModuleList } from './components/module-list';
import { AIGeneratorTab } from './components/ai-generator-tab';

export function ModuleDevtools() {
  const registry = useService<ModuleRegistry>('moduleRegistry');
  const loader = useService<ModuleLoader>('moduleLoader');
  const store = useService<ModuleStore>('moduleStore');
  const [tab, setTab] = useState<'modules' | 'ai-generator'>('modules');

  return (
    <div className="flex h-full w-full flex-col bg-black text-white">
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setTab('modules')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            tab === 'modules'
              ? 'border-b-2 border-blue-500 text-white'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Modules
        </button>
        <button
          onClick={() => setTab('ai-generator')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
            tab === 'ai-generator'
              ? 'border-b-2 border-blue-500 text-white'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Sparkles size={12} />
          AI Generator
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'modules' && <ModuleList registry={registry} loader={loader} store={store} />}
        {tab === 'ai-generator' && <AIGeneratorTab />}
      </div>
    </div>
  );
}
