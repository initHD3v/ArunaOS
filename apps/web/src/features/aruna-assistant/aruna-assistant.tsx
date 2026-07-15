'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Mic,
  Keyboard,
  LayoutPanelLeft,
  Ellipsis,
  Cloud,
  Calendar,
  Mail,
  MessageSquare,
  ChevronRight,
  Clock,
  Sun,
  Droplets,
  Wind,
  Loader,
} from 'lucide-react';
import { useWidgetPanelStore } from '@/features/desktop-widgets/stores/widget-panel.store';
import { useArunaAssistantStore } from './stores/aruna-assistant-store';
import { useAuthStore } from '@/stores/auth.store';
import { useService } from '@/providers/service-provider';
import type { LifecycleService } from '@/services/lifecycle/lifecycle-service';
import { useWeatherStore, CONDITION_EMOJI } from '@/features/weather/weather.store';
import { useLocationStore } from '@/stores/location.store';

/* ------------------------------------------------------------------ */
/*  Context Summary items                                              */
/* ------------------------------------------------------------------ */

const contextIcons = [
  { icon: Sparkles, label: "Today's Focus", color: '#5D6BFF', key: 'focus' },
  { icon: Cloud, label: 'Weather', color: '#FFB340', key: 'weather' },
  { icon: Calendar, label: 'Calendar', color: '#5D6BFF', key: 'calendar' },
  { icon: Mail, label: 'Email', color: '#30D158', key: 'email' },
  { icon: MessageSquare, label: 'DM', color: '#FF5A5F', key: 'dm' },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function Header() {
  const brief = useArunaAssistantStore((s) => s.brief);
  const greeting = brief?.greeting ?? 'Good Morning';
  const name = greeting.includes(',') ? greeting.split(',')[1]?.trim() : '';
  const timeOfDay = brief?.timeOfDay ?? 'morning';
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const w = useWeatherStore();
  const ls = useLocationStore();

  useEffect(() => {
    if (!w.loading && w.hourly.length === 0) {
      const lat = ls.enabled && ls.latitude != null ? ls.latitude : -6.2088;
      const lon = ls.enabled && ls.longitude != null ? ls.longitude : 106.8456;
      w.fetchWeather(lat, lon, ls.city);
    }
  }, []);

  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: '#5D6BFF10' }}
          >
            <Sparkles size={14} style={{ color: '#5D6BFF' }} />
          </motion.div>
          <span className="text-[13px] font-medium" style={{ color: '#707070' }}>
            {timeOfDay === 'morning'
              ? 'Good Morning'
              : timeOfDay === 'afternoon'
                ? 'Good Afternoon'
                : timeOfDay === 'evening'
                  ? 'Good Evening'
                  : 'Good Night'}
            ,
          </span>
        </div>
        <span
          className="mt-0.5 text-[28px] font-semibold tracking-tight"
          style={{ color: '#111111' }}
        >
          {name || 'User'}
        </span>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px]" style={{ color: '#707070' }}>
          <span>{days[now.getDay()]}</span>
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: '#70707030' }} />
          <span>{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      {w.loading && w.hourly.length === 0 ? (
        <div className="flex flex-col items-center gap-0.5">
          <Loader size={14} className="text-foreground/30 animate-spin" />
          <span className="text-[8px]" style={{ color: '#707070' }}>
            loading
          </span>
        </div>
      ) : w.hourly.length > 0 ? (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[22px] leading-none">{CONDITION_EMOJI[w.condition]}</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[15px] font-medium tabular-nums" style={{ color: '#111111' }}>
              {w.temp}°
            </span>
            <span className="text-[8px]" style={{ color: '#707070' }}>
              {w.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[8px]" style={{ color: '#707070' }}>
            <span className="flex items-center gap-0.5">
              <Droplets size={7} />
              {w.humidity}%
            </span>
            <span className="flex items-center gap-0.5">
              <Wind size={7} />
              {w.windSpeed}
            </span>
          </div>
        </div>
      ) : brief?.weather ? (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[22px] leading-none">☀️</span>
          <span className="text-[15px] font-medium" style={{ color: '#111111' }}>
            {brief.weather.split(' ')[2] ?? '--'}
          </span>
          <span className="text-[10px]" style={{ color: '#707070' }}>
            Now
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PersonalityMessage() {
  const brief = useArunaAssistantStore((s) => s.brief);
  if (!brief?.message) return null;
  return (
    <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#F7F8FA' }}>
      <p className="text-[14px] leading-relaxed" style={{ color: '#111111' }}>
        {brief.message}
      </p>
    </div>
  );
}

function ContextSummary() {
  const ctx = useArunaAssistantStore((s) => s.brief);
  const items = contextIcons.map((c) => {
    let value: string | null = null;
    if (c.key === 'weather' && ctx?.weather) value = ctx.weather.split(' ').slice(2).join(' ');
    return { ...c, value };
  });
  const hasData = items.some((i) => i.value !== null);
  if (!hasData) return null;
  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[11px] font-medium uppercase tracking-[0.06em]"
        style={{ color: '#707070' }}
      >
        Context
      </span>
      <div className="grid grid-cols-5 gap-2">
        {items.map((c) => (
          <div
            key={c.key}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-2.5"
            style={{ backgroundColor: '#F7F8FA' }}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: `${c.color}15` }}
            >
              <c.icon size={12} style={{ color: c.color }} />
            </div>
            <span
              className="text-center text-[10px] font-medium leading-tight"
              style={{ color: c.value ? '#111111' : '#B0B0B0' }}
            >
              {c.value || '--'}
            </span>
            <span className="text-[8px]" style={{ color: '#707070' }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AISuggestions() {
  const suggestions = useArunaAssistantStore((s) => s.suggestions);
  if (suggestions.length === 0) return null;

  const suggestionColors: Record<string, string> = {
    sparkles: '#5D6BFF',
    mail: '#30D158',
    sun: '#FFB340',
    calendar: '#FF5A5F',
  };

  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[11px] font-medium uppercase tracking-[0.06em]"
        style={{ color: '#707070' }}
      >
        Suggested for You
      </span>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((s) => {
          const color = suggestionColors[s.icon] ?? '#5D6BFF';
          const Icon =
            s.icon === 'sparkles'
              ? Sparkles
              : s.icon === 'mail'
                ? Mail
                : s.icon === 'sun'
                  ? Sun
                  : Calendar;
          return (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={s.action}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors"
              style={{ backgroundColor: '#F7F8FA' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#F0F1F3';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#F7F8FA';
              }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[13px] font-medium" style={{ color: '#111111' }}>
                  {s.title}
                </div>
                <div className="text-[11px]" style={{ color: '#707070' }}>
                  {s.description}
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: '#707070' }}>
                <Clock size={10} />
                {s.estimatedTime}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ConversationPreview() {
  const preview = useArunaAssistantStore((s) => s.conversationPreview);
  return (
    <div className="rounded-2xl px-5 py-3" style={{ backgroundColor: '#5D6BFF08' }}>
      <p className="text-center text-[13px] italic" style={{ color: '#707070' }}>
        &ldquo;{preview}&rdquo;
      </p>
    </div>
  );
}

function BottomActions() {
  const { inputMode, setInputMode, voiceActive, toggleVoice, processInput, processing } =
    useArunaAssistantStore();

  const actions = [
    { icon: Mic, label: 'Voice', action: toggleVoice, active: voiceActive },
    {
      icon: Keyboard,
      label: 'Keyboard',
      action: () => setInputMode('keyboard'),
      active: inputMode === 'keyboard',
    },
    { icon: LayoutPanelLeft, label: 'Workspace', active: false, action: () => {} },
    { icon: Ellipsis, label: 'More', active: false, action: () => {} },
  ];

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {inputMode === 'keyboard' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              type="text"
              placeholder="Ask Aruna anything..."
              className="h-9 flex-1 rounded-xl border-0 bg-[#F7F8FA] px-3 text-[12px] outline-none"
              style={{ color: '#111111' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  processInput(e.currentTarget.value.trim());
                  e.currentTarget.value = '';
                  setInputMode('idle');
                }
                if (e.key === 'Escape') setInputMode('idle');
              }}
            />
            <button
              onClick={() => setInputMode('idle')}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#F7F8FA]"
              style={{ color: '#707070' }}
            >
              <ChevronRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.action}
            className="flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
            style={{
              borderColor: a.active ? '#5D6BFF' : '#E5E5EA',
              color: a.active ? '#5D6BFF' : '#707070',
              backgroundColor: a.active ? '#5D6BFF08' : 'transparent',
            }}
            title={a.label}
          >
            {processing && a.label === 'Keyboard' ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <a.icon size={16} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

export const ArunaAssistant = memo(function ArunaAssistant() {
  const visible = useWidgetPanelStore((s) => s.visible);
  const isBlocked = useAuthStore((s) => s.isAuthEnabled && (!s.hasSession || s.isLocked));
  const { collapsed, setCollapsed, position, setPosition } = useArunaAssistantStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const lifecycle = useService<LifecycleService>('lifecycle');

  // Single effect for all lifecycle management: init, lock/unlock, shutdown/sleep/resume
  useEffect(() => {
    const store = useArunaAssistantStore.getState();

    if (!store.initialized && !isBlocked) {
      store.restore();
    }

    const onSuspend = () => {
      useArunaAssistantStore.getState().suspend();
    };
    const onRestore = () => {
      useArunaAssistantStore.getState().restore();
    };

    const unsubShutdown = lifecycle.onShutdown(onSuspend);
    const unsubSleep = lifecycle.onSleep(onSuspend);
    const unsubResume = lifecycle.onResume(onRestore);

    return () => {
      unsubShutdown();
      unsubSleep();
      unsubResume();
    };
  }, [isBlocked, lifecycle, setCollapsed, setPosition]);

  // ESC to collapse
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && !collapsed) setCollapsed(true);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [collapsed, setCollapsed]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, [role="button"]')) return;
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: rect.left, oy: rect.top };
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging || !dragRef.current) return;
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      setPosition({
        x: dragRef.current.ox + e.clientX - dragRef.current.sx,
        y: dragRef.current.oy + e.clientY - dragRef.current.sy,
      });
    }
    function onUp() {
      setDragging(false);
      dragRef.current = null;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, setPosition]);

  const [idle, setIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapsedDragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [collapsedDragging, setCollapsedDragging] = useState(false);

  useEffect(() => {
    if (collapsed && !collapsedDragging) {
      idleTimerRef.current = setTimeout(() => setIdle(true), 3000);
    } else {
      setIdle(false);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    }
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [collapsed, collapsedDragging]);

  const handleCollapsedPointerDown = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    collapsedDragRef.current = { sx: e.clientX, sy: e.clientY, ox: rect.left, oy: rect.top };
    setCollapsedDragging(true);
  }, []);

  useEffect(() => {
    if (!collapsedDragging || !collapsedDragRef.current) return;
    function onMove(e: MouseEvent) {
      if (!collapsedDragRef.current) return;
      const dx = e.clientX - collapsedDragRef.current.sx;
      const dy = e.clientY - collapsedDragRef.current.sy;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      setPosition({
        x: collapsedDragRef.current.ox + dx,
        y: collapsedDragRef.current.oy + dy,
      });
    }
    function onUp(e: MouseEvent) {
      const d = collapsedDragRef.current;
      if (d) {
        const dx = e.clientX - d.sx;
        const dy = e.clientY - d.sy;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
          setCollapsed(false);
        }
      }
      setCollapsedDragging(false);
      collapsedDragRef.current = null;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [collapsedDragging, setPosition, setCollapsed]);

  if (!visible || isBlocked) return null;

  return (
    <>
      <AnimatePresence>
        {collapsed && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: idle ? 0.25 : 1,
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              opacity: { duration: idle ? 0.8 : 0.3, ease: 'easeInOut' },
            }}
            onMouseDown={handleCollapsedPointerDown}
            onMouseEnter={() => {
              if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
                idleTimerRef.current = null;
              }
              setIdle(false);
            }}
            onMouseLeave={() => {
              idleTimerRef.current = setTimeout(() => setIdle(true), 3000);
            }}
            className={cn(
              'fixed z-[9999] flex h-20 w-20 items-center justify-center',
              collapsedDragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
            style={{
              left: position.x || undefined,
              right: position.x ? undefined : 24,
              top: position.y || undefined,
              bottom: position.y ? undefined : 24,
            }}
          >
            <motion.div
              animate={{
                scale: idle ? [1, 1.02, 1] : [1, 1.07, 1],
              }}
              transition={{ duration: idle ? 4 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex h-14 w-14 items-center justify-center"
            >
              <motion.div
                animate={{ opacity: idle ? 0.3 : 0.6 }}
                transition={{ duration: 0.8 }}
                className="absolute -inset-3 rounded-full bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent blur-xl"
              />
              <div className="absolute inset-0 rounded-full ring-1 ring-violet-400/20" />
              <img
                src="/logo.png"
                alt="ArunaOS"
                className="relative h-10 w-10 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                style={{
                  filter: idle
                    ? 'grayscale(0.3) brightness(0.6) drop-shadow(0 0 6px rgba(139,92,246,0.15))'
                    : 'drop-shadow(0 0 12px rgba(139,92,246,0.3))',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed z-[9999] flex flex-col overflow-hidden shadow-2xl"
            style={{
              width: 420,
              borderRadius: 32,
              left: position.x || undefined,
              right: position.x ? undefined : 24,
              top: position.y || undefined,
              bottom: position.y ? undefined : 24,
              boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundColor: '#FFFFFFE5', backdropFilter: 'blur(36px)' }}
            />
            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                backgroundSize: '200px 200px',
              }}
            />

            <div
              onMouseDown={handleMouseDown}
              className={`relative px-6 pt-5 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <div
                className="mx-auto mb-3 h-1 w-8 rounded-full"
                style={{ backgroundColor: '#E5E5EA' }}
              />
            </div>

            <div
              onMouseDown={handleMouseDown}
              className="relative flex flex-col gap-5 overflow-y-auto px-6 pb-5"
              style={{ maxHeight: 560 }}
            >
              <Header />
              <PersonalityMessage />
              <ContextSummary />
              <AISuggestions />
              <ConversationPreview />
              <BottomActions />
            </div>

            <div className="relative px-6 pb-3">
              <button
                onClick={() => setCollapsed(true)}
                className="mx-auto flex items-center gap-1 text-[10px] transition-colors"
                style={{ color: '#70707080' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#707070';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#70707080';
                }}
              >
                <ChevronRight size={10} />
                collapse
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
