'use client';

import {
  useArunaAssistantSettings,
  BUTTON_SIZE_MAP,
} from '@/features/aruna-assistant/stores/aruna-assistant-settings.store';
import type { CollapsedButtonSize } from '@/features/aruna-assistant/stores/aruna-assistant-settings.store';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AssistantPanel() {
  const settings = useArunaAssistantSettings();

  const resetAll = () => {
    settings.setStartCollapsed(false);
    settings.setIdleTimeout(3);
    settings.setIdleOpacity(0.25);
    settings.setCollapseOnEscape(true);
    settings.setButtonSize('medium');
    settings.setShowWeather(true);
    settings.setShowSuggestions(true);
    settings.setShowContextSummary(true);
    settings.setRememberPosition(true);
    settings.setContextAware(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Aruna Assistant</h2>
          <p className="text-foreground/40 mt-0.5 text-[10px]">Asisten pribadi berbasis AI</p>
        </div>
        <button
          onClick={resetAll}
          className="text-foreground/40 hover:text-foreground/70 flex items-center gap-1 text-[10px] transition-colors"
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>

      {/* General */}
      <div className="space-y-3">
        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wider">Umum</h3>
        <ToggleRow
          label="Mulai dalam keadaan collapsed"
          desc="Asisten akan muncul sebagai button kecil saat startup"
          checked={settings.startCollapsed}
          onChange={settings.setStartCollapsed}
        />
        <ToggleRow
          label="Collapse dengan Escape"
          desc="Tekan Escape untuk menutup panel"
          checked={settings.collapseOnEscape}
          onChange={settings.setCollapseOnEscape}
        />
        <ToggleRow
          label="Ingat posisi"
          desc="Menyimpan posisi asisten setelah digeser"
          checked={settings.rememberPosition}
          onChange={settings.setRememberPosition}
        />
        <ToggleRow
          label="Suggestions kontekstual"
          desc="Menyesuaikan saran berdasarkan waktu, cuaca, dan aktivitas"
          checked={settings.contextAware}
          onChange={settings.setContextAware}
        />
      </div>

      {/* Idle & Collapse */}
      <div className="space-y-3">
        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wider">
          Idle & Collapse
        </h3>
        <SliderRow
          label="Waktu idle auto-fade"
          desc="Detik sebelum button collapsed meredup (0 = mati)"
          min={0}
          max={10}
          step={1}
          value={settings.idleTimeout}
          onChange={settings.setIdleTimeout}
          suffix="dtk"
        />
        <SliderRow
          label="Opacity saat idle"
          desc="Keburaman button collapsed saat tidak digunakan"
          min={5}
          max={100}
          step={5}
          value={Math.round(settings.idleOpacity * 100)}
          onChange={(v) => settings.setIdleOpacity(v / 100)}
          suffix="%"
        />
      </div>

      {/* Appearance */}
      <div className="space-y-3">
        <h3 className="text-foreground text-xs font-semibold uppercase tracking-wider">Tampilan</h3>

        <div>
          <p className="text-foreground/80 mb-2 text-xs font-medium">Ukuran button collapsed</p>
          <div className="flex gap-2">
            {(
              [
                { id: 'small', label: 'Kecil' },
                { id: 'medium', label: 'Sedang' },
                { id: 'large', label: 'Besar' },
              ] as { id: CollapsedButtonSize; label: string }[]
            ).map((opt) => {
              const size = BUTTON_SIZE_MAP[opt.id];
              return (
                <button
                  key={opt.id}
                  onClick={() => settings.setButtonSize(opt.id)}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-2 rounded-xl border p-3 transition-colors',
                    settings.buttonSize === opt.id
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/20 text-foreground/50 hover:border-border/40 hover:bg-muted/30',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-violet-600/10',
                      size.container,
                    )}
                  >
                    <div className={cn('rounded-full bg-violet-500/30', size.logo)} />
                  </div>
                  <span className="text-[10px] font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <ToggleRow
          label="Tampilkan cuaca"
          desc="Informasi cuaca di header asisten"
          checked={settings.showWeather}
          onChange={settings.setShowWeather}
        />
        <ToggleRow
          label="Tampilkan saran"
          desc="AI suggestions di panel asisten"
          checked={settings.showSuggestions}
          onChange={settings.setShowSuggestions}
        />
        <ToggleRow
          label="Tampilkan konteks"
          desc="Ringkasan konteks (fokus, cuaca, jadwal)"
          checked={settings.showContextSummary}
          onChange={settings.setShowContextSummary}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="border-border/20 flex items-center gap-3 rounded-xl border p-3">
      <div className="flex-1">
        <p className="text-foreground/80 text-xs font-medium">{label}</p>
        <p className="text-foreground/40 text-[10px]">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-foreground/20',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

function SliderRow({
  label,
  desc,
  min,
  max,
  step,
  value,
  onChange,
  suffix,
}: {
  label: string;
  desc: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div className="border-border/20 rounded-xl border p-3">
      <div className="mb-2">
        <p className="text-foreground/80 text-xs font-medium">{label}</p>
        <p className="text-foreground/40 text-[10px]">{desc}</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="accent-primary flex-1"
        />
        <span className="text-foreground/60 min-w-10 text-right text-xs tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
    </div>
  );
}
