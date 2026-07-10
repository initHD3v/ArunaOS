'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { cn } from '@/lib/utils';
import {
  Cpu,
  MemoryStick,
  Activity,
  Monitor,
  BatteryWarning,
  Wifi,
  Clock,
  HardDrive,
} from 'lucide-react';

type Tab = 'processes' | 'cpu' | 'memory' | 'system' | 'network';

interface CpuSample {
  time: number;
  load: number;
}

interface MemSample {
  time: number;
  used: number;
  total: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m % 60}m`);
  parts.push(`${s % 60}s`);
  return parts.join(' ');
}

const Sparkline = memo(function Sparkline({
  data,
  max,
  color,
}: {
  data: number[];
  max: number;
  color: string;
}) {
  if (data.length < 2) return null;
  const w = 120;
  const h = 32;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (Math.min(v, max) / max) * (h - 2) - 1,
  }));
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

const InfoRow = memo(function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border-border/5 flex items-center justify-between border-b py-1 text-xs last:border-0">
      <span className="text-foreground/50">{label}</span>
      <div className="flex items-center gap-2">
        {hint && <span className="text-foreground/30 text-[10px]">{hint}</span>}
        <span className="text-foreground/80 font-mono">{value}</span>
      </div>
    </div>
  );
});

const UsageBar = memo(function UsageBar({
  value,
  max,
  label,
  color,
  unit,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  unit?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const displayPct = Math.min(100, pct);
  const barColor = displayPct > 90 ? 'bg-red-500' : displayPct > 70 ? 'bg-yellow-500' : color;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/60">{label}</span>
        <span className="text-foreground/80 font-mono">
          {unit === 'bytes' ? formatBytes(value) : `${value.toFixed(1)}`}
          <span className="text-foreground/40 ml-1 text-[10px]">
            / {unit === 'bytes' ? formatBytes(max) : max.toFixed(0)}
            {unit === '%' ? '%' : ''}
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
          style={{ width: `${displayPct}%` }}
        />
      </div>
    </div>
  );
});

const MetricCard = memo(function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-border/10 flex min-w-0 items-center gap-3 rounded-xl border bg-white/[0.03] px-4 py-3',
        className,
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
        <Icon size={16} className="text-foreground/60" />
      </div>
      <div className="min-w-0">
        <div className="text-foreground/40 text-[10px] uppercase tracking-wider">{label}</div>
        <div className="text-foreground/90 truncate font-mono text-sm font-semibold">{value}</div>
        {sub && <div className="text-foreground/40 truncate text-[10px]">{sub}</div>}
      </div>
    </div>
  );
});

export const AStat = memo(function AStat() {
  const windows = useWindowStore((s) => s.windows);
  const [tab, setTab] = useState<Tab>('processes');
  const [startTime] = useState(Date.now());
  const [cpuHistory, setCpuHistory] = useState<CpuSample[]>([]);
  const [memHistory, setMemHistory] = useState<MemSample[]>([]);
  const [cpuLoad, setCpuLoad] = useState(0);
  const [memInfo, setMemInfo] = useState({ used: 0, total: 0, limit: 0 });
  const [coreLoads, setCoreLoads] = useState<number[]>([]);
  const [sortKey, setSortKey] = useState<string>('cpu');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const coreCount = navigator.hardwareConcurrency || 1;
    let prevTime = performance.now();
    let smoothedLoad = 0;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - prevTime;
      prevTime = now;

      const expectedMs = 1000;
      const slack = 16;
      const drift = Math.max(0, elapsed - expectedMs - slack);
      const raw = Math.min(100, (drift / expectedMs) * 100);
      smoothedLoad = smoothedLoad * 0.85 + raw * 0.15;
      const load = Math.round(smoothedLoad * 10) / 10;

      const base = load / coreCount;
      const perCore = Array.from({ length: coreCount }, (_, i) =>
        Math.min(100, base + (load > 0 ? (i === 0 ? load * 0.1 : 0) : 0)),
      );

      setCoreLoads(perCore);
      setCpuLoad(load);

      setCpuHistory((prev) => {
        const next = [...prev, { time: Date.now(), load }];
        return next.length > 60 ? next.slice(-60) : next;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perf = (performance as any).memory;
      if (perf) {
        const used = perf.usedJSHeapSize;
        const total = perf.totalJSHeapSize;
        const limit = perf.jsHeapSizeLimit;
        setMemInfo({ used, total, limit });
        setMemHistory((prev) => {
          const next = [...prev, { time: Date.now(), used, total }];
          return next.length > 60 ? next.slice(-60) : next;
        });
      }
    };

    prevTime = performance.now();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const uptime = useMemo(() => Date.now() - startTime, [startTime]);

  const memUsedPct = memInfo.limit > 0 ? (memInfo.used / memInfo.limit) * 100 : 0;
  const memTotalPct = memInfo.limit > 0 ? (memInfo.total / memInfo.limit) * 100 : 0;
  const cpuAvg =
    cpuHistory.length > 0 ? cpuHistory.reduce((a, b) => a + b.load, 0) / cpuHistory.length : 0;

  const processList = useMemo(() => {
    const totalHeap = memInfo.used;
    const count = Object.keys(windows).length || 1;
    return Object.entries(windows)
      .map(([id, w]) => ({
        pid: id,
        name: w.title,
        appId: w.appId,
        state: w.state,
        memory:
          w.state === 'minimized'
            ? Math.round((totalHeap * 0.3) / count)
            : Math.round((totalHeap * 1.2) / count),
        cpu:
          Object.keys(windows).length > 0
            ? (cpuLoad / Object.keys(windows).length) * (w.state === 'minimized' ? 0.2 : 1)
            : 0,
      }))
      .sort((a, b) => {
        const dir = sortAsc ? 1 : -1;
        if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
        if (sortKey === 'memory') return (a.memory - b.memory) * dir;
        if (sortKey === 'cpu') return (a.cpu - b.cpu) * dir;
        if (sortKey === 'state') return a.state.localeCompare(b.state) * dir;
        return 0;
      });
  }, [windows, memInfo.used, cpuLoad, sortKey, sortAsc]);

  const memHistoryPct = useMemo(
    () => memHistory.map((m) => (m.total > 0 ? (m.used / m.total) * 100 : 0)),
    [memHistory],
  );

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'processes', label: 'Processes', icon: Activity },
    { id: 'cpu', label: 'CPU', icon: Cpu },
    { id: 'memory', label: 'Memory', icon: MemoryStick },
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'network', label: 'Network', icon: Wifi },
  ];

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortIndicator = (key: string) => {
    if (sortKey !== key) return '';
    return sortAsc ? ' ▲' : ' ▼';
  };

  return (
    <div className="bg-background/40 flex h-full flex-col">
      <div className="border-border/20 flex shrink-0 items-center overflow-x-auto border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
              tab === t.id
                ? 'text-foreground border-foreground/60'
                : 'text-foreground/40 hover:text-foreground/60 border-transparent',
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="border-border/10 grid grid-cols-2 gap-2 border-b bg-white/[0.02] p-3 md:grid-cols-4">
        <MetricCard
          icon={Cpu}
          label="CPU Load"
          value={`${cpuLoad.toFixed(1)}%`}
          sub={`Avg ${cpuAvg.toFixed(1)}%`}
        />
        <MetricCard
          icon={MemoryStick}
          label="Memory"
          value={formatBytes(memInfo.used)}
          sub={`${memInfo.total > 0 ? ((memInfo.used / memInfo.total) * 100).toFixed(1) : '0'}% of heap`}
        />
        <MetricCard
          icon={Activity}
          label="Processes"
          value={String(Object.keys(windows).length)}
          sub={`${Object.values(windows).filter((w) => w.state === 'active').length} active`}
        />
        <MetricCard
          icon={Clock}
          label="Uptime"
          value={formatDuration(uptime)}
          sub={`Since ${new Date(startTime).toLocaleTimeString()}`}
        />
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'processes' && (
          <div className="p-2">
            <div className="text-foreground/30 border-border/10 flex items-center gap-2 border-b px-2 py-1 text-[10px] font-medium uppercase tracking-wider">
              <button
                onClick={() => handleSort('name')}
                className="hover:text-foreground/60 flex-1 text-left transition-colors"
              >
                Name{sortIndicator('name')}
              </button>
              <button
                onClick={() => handleSort('state')}
                className="hover:text-foreground/60 w-20 text-right transition-colors"
              >
                State{sortIndicator('state')}
              </button>
              <button
                onClick={() => handleSort('memory')}
                className="hover:text-foreground/60 w-24 text-right transition-colors"
              >
                Memory{sortIndicator('memory')}
              </button>
              <button
                onClick={() => handleSort('cpu')}
                className="hover:text-foreground/60 w-20 text-right transition-colors"
              >
                CPU{sortIndicator('cpu')}
              </button>
            </div>
            {processList.map((p) => (
              <div
                key={p.pid}
                className="text-foreground/70 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className="text-foreground/30 w-16 shrink-0 truncate font-mono text-[9px]"
                    title={p.pid}
                  >
                    {p.pid.slice(0, 8)}
                  </span>
                  <span className="truncate">{p.name}</span>
                </div>
                <span
                  className={cn(
                    'w-20 text-right text-[10px] font-medium',
                    p.state === 'active' ? 'text-green-400' : 'text-foreground/30',
                  )}
                >
                  {p.state}
                </span>
                <span className="text-foreground/50 w-24 text-right font-mono text-[10px]">
                  {formatBytes(p.memory)}
                </span>
                <div className="flex w-20 items-center justify-end gap-1.5">
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        p.cpu > 50 ? 'bg-yellow-500' : p.cpu > 20 ? 'bg-blue-500' : 'bg-green-500',
                      )}
                      style={{ width: `${Math.min(100, p.cpu)}%` }}
                    />
                  </div>
                  <span className="text-foreground/50 w-8 text-right font-mono text-[10px]">
                    {p.cpu.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'cpu' && (
          <div className="space-y-5 p-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-foreground/70 text-xs font-medium">Total CPU Load</span>
                <span
                  className="font-mono text-lg font-bold"
                  style={{ color: cpuLoad > 70 ? '#ef4444' : cpuLoad > 40 ? '#eab308' : '#22c55e' }}
                >
                  {cpuLoad.toFixed(1)}%
                </span>
              </div>
              <UsageBar value={cpuLoad} max={100} label="" color="bg-blue-500" unit="%" />
            </div>

            {cpuHistory.length > 1 && (
              <div>
                <div className="text-foreground/40 mb-1.5 text-[10px] uppercase tracking-wider">
                  Last 60s
                </div>
                <div className="flex items-center gap-4 overflow-x-auto rounded-lg bg-white/[0.03] p-3">
                  <Sparkline data={cpuHistory.map((s) => s.load)} max={100} color="#3b82f6" />
                  <div className="text-foreground/40 whitespace-nowrap font-mono text-[10px]">
                    Min {Math.min(...cpuHistory.map((s) => s.load)).toFixed(0)}%{' · '}Max{' '}
                    {Math.max(...cpuHistory.map((s) => s.load)).toFixed(0)}%{' · '}Avg{' '}
                    {cpuAvg.toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            {coreLoads.length > 1 && (
              <div className="space-y-2">
                <div className="text-foreground/40 mb-1.5 text-[10px] uppercase tracking-wider">
                  Per-Core
                </div>
                {coreLoads.map((load, i) => (
                  <UsageBar
                    key={i}
                    value={load}
                    max={100}
                    label={`Core ${i}`}
                    color="bg-cyan-500"
                    unit="%"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'memory' && (
          <div className="space-y-5 p-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-foreground/70 text-xs font-medium">JS Heap Usage</span>
                <div className="text-right">
                  <span className="font-mono text-lg font-bold">{formatBytes(memInfo.used)}</span>
                  <span className="text-foreground/40 ml-1 text-xs">
                    / {formatBytes(memInfo.total)}
                  </span>
                </div>
              </div>
              <UsageBar
                value={memInfo.used}
                max={memInfo.total}
                label=""
                color="bg-purple-500"
                unit="bytes"
              />
            </div>

            {memHistory.length > 1 && (
              <div>
                <div className="text-foreground/40 mb-1.5 text-[10px] uppercase tracking-wider">
                  Last 60s
                </div>
                <div className="flex items-center gap-4 overflow-x-auto rounded-lg bg-white/[0.03] p-3">
                  <Sparkline data={memHistoryPct} max={100} color="#a855f7" />
                  <div className="text-foreground/40 whitespace-nowrap font-mono text-[10px]">
                    Peak {formatBytes(Math.max(...memHistory.map((m) => m.used)))}
                  </div>
                </div>
              </div>
            )}

            <div className="border-border/10 space-y-1 border-t pt-2">
              <div className="text-foreground/40 mb-1.5 text-[10px] uppercase tracking-wider">
                Details
              </div>
              <InfoRow
                label="Heap Used"
                value={formatBytes(memInfo.used)}
                hint={`${memUsedPct.toFixed(1)}%`}
              />
              <InfoRow
                label="Heap Total"
                value={formatBytes(memInfo.total)}
                hint={`${memTotalPct.toFixed(1)}%`}
              />
              <InfoRow label="Heap Limit" value={formatBytes(memInfo.limit)} />
              <InfoRow
                label="Per Process (avg)"
                value={
                  processList.length > 0 ? formatBytes(memInfo.used / processList.length) : '—'
                }
              />
            </div>
          </div>
        )}

        {tab === 'system' && (
          <div className="space-y-4 p-4">
            <Section title="Operating System" icon={<Monitor size={14} />}>
              <InfoRow label="Platform" value={navigator.platform} />
              <InfoRow
                label="User Agent"
                value={navigator.userAgent.split(' ').slice(0, 3).join(' ')}
                hint="truncated"
              />
              <InfoRow label="Language" value={navigator.language} />
              <InfoRow label="Timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
            </Section>

            <Section title="Hardware" icon={<HardDrive size={14} />}>
              <InfoRow label="CPU Cores" value={String(navigator.hardwareConcurrency)} />
              <InfoRow label="Logical CPUs" value={String(navigator.hardwareConcurrency)} />
              <InfoRow label="Memory (JS Heap Limit)" value={formatBytes(memInfo.limit)} />
            </Section>

            <Section title="Display" icon={<Monitor size={14} />}>
              <InfoRow label="Resolution" value={`${screen.width} × ${screen.height}`} />
              <InfoRow label="Color Depth" value={`${screen.colorDepth}-bit`} />
              <InfoRow label="Pixel Ratio" value={`${window.devicePixelRatio}x`} />
              <InfoRow label="Available" value={`${screen.availWidth} × ${screen.availHeight}`} />
            </Section>

            <BatterySection />
          </div>
        )}

        {tab === 'network' && (
          <div className="space-y-4 p-4">
            <NetworkSection />
          </div>
        )}
      </div>
    </div>
  );
});

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-foreground/60 border-border/10 mb-2 flex items-center gap-1.5 border-b pb-1.5">
        {icon}
        <span className="text-foreground/80 text-xs font-medium">{title}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

const BatterySection = memo(function BatterySection() {
  const [battery, setBattery] = useState<{
    level: number;
    charging: boolean;
    time?: number;
  } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!('getBattery' in navigator)) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).getBattery().then((b: any) => {
      if (cancelled) return;
      const update = () => {
        if (cancelled) return;
        setBattery({
          level: b.level,
          charging: b.charging,
          time: b.charging ? b.chargingTime : b.dischargingTime,
        });
      };
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
      b.addEventListener('chargingtimechange', update);
      b.addEventListener('dischargingtimechange', update);
      cleanupRef.current = () => {
        b.removeEventListener('levelchange', update);
        b.removeEventListener('chargingchange', update);
        b.removeEventListener('chargingtimechange', update);
        b.removeEventListener('dischargingtimechange', update);
      };
    });
    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, []);

  if (!battery) {
    return (
      <Section title="Battery" icon={<BatteryWarning size={14} />}>
        <div className="text-foreground/40 text-xs italic">Battery API not available</div>
      </Section>
    );
  }

  return (
    <Section title="Battery" icon={<BatteryWarning size={14} />}>
      <InfoRow label="Level" value={`${Math.round(battery.level * 100)}%`} />
      <InfoRow label="Status" value={battery.charging ? 'Charging' : 'Discharging'} />
      {battery.time !== undefined && battery.time < Infinity && (
        <InfoRow
          label={battery.charging ? 'Time to Full' : 'Time Remaining'}
          value={formatDuration(battery.time * 1000)}
        />
      )}
      <div className="mt-1.5">
        <UsageBar
          value={battery.level * 100}
          max={100}
          label=""
          color={battery.level < 0.2 ? 'bg-red-500' : 'bg-green-500'}
          unit="%"
        />
      </div>
    </Section>
  );
});

const NetworkSection = memo(function NetworkSection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conn = (navigator as any).connection as
    | { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean; type?: string }
    | undefined;

  return (
    <>
      <Section title="Connection" icon={<Wifi size={14} />}>
        {conn ? (
          <>
            <InfoRow label="Type" value={conn.type ?? conn.effectiveType ?? 'unknown'} />
            <InfoRow label="Effective" value={conn.effectiveType ?? '—'} />
            <InfoRow
              label="Downlink"
              value={conn.downlink != null ? `${conn.downlink} Mbps` : '—'}
            />
            <InfoRow label="RTT" value={conn.rtt != null ? `${conn.rtt} ms` : '—'} />
            {conn.saveData != null && (
              <InfoRow label="Data Saver" value={conn.saveData ? 'Active' : 'Off'} />
            )}
          </>
        ) : (
          <div className="text-foreground/40 text-xs italic">
            Network Information API not available
          </div>
        )}
      </Section>

      <Section title="Local Storage" icon={<HardDrive size={14} />}>
        <InfoRow label="Used" value={formatBytes(new Blob([JSON.stringify(localStorage)]).size)} />
        <InfoRow label="Keys" value={String(localStorage.length)} />
        <InfoRow
          label="ArunaOS Prefixes"
          value={String(Object.keys(localStorage).filter((k) => k.startsWith('arunaos-')).length)}
        />
      </Section>
    </>
  );
});
