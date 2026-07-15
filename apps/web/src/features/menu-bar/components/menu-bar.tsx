'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  Moon,
  Lock,
  Moon as MoonIcon,
  Power,
  RotateCcw,
  Info,
  Sliders,
  LayoutPanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useService, useEventBus } from '@/providers/service-provider';
import type { ThemeService, ThemeMode } from '@arunaos/services';
import type { LifecycleService } from '@/services/lifecycle/lifecycle-service';
import { useIsMobile } from '@/hooks/use-media-query';
import { AboutOverlay } from './about-overlay';
import { CalendarPopup } from './calendar-popup';
import { usePerformanceStore } from '@/stores/performance.store';
import { useWidgetPanelStore } from '@/features/desktop-widgets/stores/widget-panel.store';
import { useArunaAssistantStore } from '@/features/aruna-assistant/stores/aruna-assistant-store';

import { NotificationIndicator } from '@/features/desktop-widgets/components/notification-indicator';
import { NotificationCenterPopup } from '@/features/desktop-widgets/components/notification-center';
import { ControlCenterPopup } from '@/features/desktop-widgets/components/control-center';

function useTime() {
  const [time, setTime] = useState(new Date());
  const perfMode = usePerformanceStore((s) => s.mode);

  useEffect(() => {
    const interval = perfMode === 'normal' ? 1000 : 30000;
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), interval);
    return () => clearInterval(id);
  }, [perfMode]);

  return time;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function ThemeToggle() {
  const themeService = useService<ThemeService>('theme');
  const bus = useEventBus();
  const isMobile = useIsMobile();
  const [currentMode, setCurrentMode] = useState<ThemeMode>(themeService.getMode());

  useEffect(() => {
    const unsub = bus.on('theme:changed', ({ mode }: { mode: ThemeMode }) => {
      setCurrentMode(mode);
    });
    return unsub;
  }, [bus]);

  const isDark =
    currentMode === 'dark' ||
    (currentMode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      onClick={() => themeService.setMode(isDark ? 'light' : 'dark')}
      className={cn(
        'flex items-center justify-center rounded-md',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-muted transition-colors duration-150',
        isMobile ? 'h-8 w-8' : 'h-6 w-6',
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={isMobile ? 16 : 14} /> : <Moon size={isMobile ? 16 : 14} />}
    </button>
  );
}

function SleepOverlay({ onWake }: { onWake: () => void }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-[2px]"
      onClick={onWake}
      style={{ willChange: 'opacity' }}
    >
      <div
        className="pointer-events-none flex flex-col items-center gap-1"
        style={{ transition: 'opacity 0.6s ease' }}
      >
        <span className="text-6xl font-light tabular-nums tracking-wider text-white/70">
          {formatTime(time)}
        </span>
        <span className="text-sm text-white/30">{formatDate(time)}</span>
      </div>
      <p className="pointer-events-none absolute bottom-12 text-xs text-white/15">
        Click anywhere to wake
      </p>
    </div>
  );
}

function ShutdownOverlay({ onRestart }: { onRestart?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        <Power size={48} className="text-white/30" />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-lg font-light tracking-wide text-white/50"
        >
          Shutting down...
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-xs text-white/20"
        >
          All processes have been terminated.
        </motion.p>
        {onRestart && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            onClick={onRestart}
            className="mt-4 text-xs text-white/30 transition-colors hover:text-white/60"
          >
            Press any key to restart
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

function RestartOverlay() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready) {
      window.location.reload();
    }
  }, [ready]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <RotateCcw size={48} className="text-white/30" />
        <p className="text-lg font-light tracking-wide text-white/50">Restarting...</p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-white/20"
        >
          All processes will be terminated.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

function AppleMenu({
  onClose,
  onAbout,
  onSleep,
  onRestart,
  onShutdown,
}: {
  onClose: () => void;
  onAbout: () => void;
  onSleep: () => void;
  onRestart: () => void;
  onShutdown: () => void;
}) {
  const lock = useAuthStore((s) => s.lock);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleAbout = useCallback(() => {
    onClose();
    onAbout();
  }, [onClose, onAbout]);

  const handleLock = useCallback(() => {
    onClose();
    lock();
  }, [onClose, lock]);

  const handleSleep = useCallback(() => {
    onClose();
    onSleep();
  }, [onClose, onSleep]);

  const handleRestart = useCallback(() => {
    onClose();
    onRestart();
  }, [onClose, onRestart]);

  const handleShutdown = useCallback(() => {
    onClose();
    onShutdown();
  }, [onClose, onShutdown]);

  type AppleMenuItem = {
    id: string;
    label: string;
    icon?: React.ElementType;
    action?: () => void;
    disabled?: boolean;
    separator?: boolean;
  };
  const items: AppleMenuItem[] = [
    { id: 'about', label: 'About ArunaOS', icon: Info, action: handleAbout },
    { id: 'sep1', label: '', separator: true },
    { id: 'lock', label: 'Lock Screen', icon: Lock, action: handleLock },
    { id: 'sleep', label: 'Sleep', icon: MoonIcon, action: handleSleep },
    { id: 'sep2', label: '', separator: true },
    { id: 'restart', label: 'Restart...', icon: RotateCcw, action: handleRestart },
    { id: 'shutdown', label: 'Shut Down...', icon: Power, action: handleShutdown },
  ];

  return (
    <div
      ref={menuRef}
      className="border-border/30 bg-background/80 absolute left-0 top-full z-[9999] mt-1 w-52 rounded-xl border py-1 shadow-2xl backdrop-blur-2xl"
    >
      {items.map((item) => {
        if (item.separator) {
          return <div key={item.id} className="border-border/20 mx-2 my-1 border-t" />;
        }
        const Icon = item.icon!;
        return (
          <button
            key={item.id}
            onClick={item.action}
            disabled={item.disabled}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-1.5 text-sm transition-colors',
              item.disabled
                ? 'text-foreground/30'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon size={14} className="shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function WidgetToggleButton({ isMobile }: { isMobile: boolean }) {
  const visible = useWidgetPanelStore((s) => s.visible);
  const toggle = useWidgetPanelStore((s) => s.toggle);
  const collapsed = useArunaAssistantStore((s) => s.collapsed);
  const setCollapsed = useArunaAssistantStore((s) => s.setCollapsed);

  const handleClick = useCallback(() => {
    if (!visible) {
      useWidgetPanelStore.getState().show();
      useArunaAssistantStore.getState().setCollapsed(false);
    } else if (collapsed) {
      setCollapsed(false);
    } else {
      toggle();
    }
  }, [visible, collapsed, toggle, setCollapsed]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center justify-center rounded-md transition-colors',
        isMobile ? 'h-8 w-8' : 'h-6 w-6',
        visible
          ? 'bg-muted text-foreground'
          : 'text-foreground/60 hover:text-foreground hover:bg-muted/50',
      )}
      title={visible ? (collapsed ? 'Buka Widget' : 'Sembunyikan Widget') : 'Tampilkan Widget'}
    >
      <LayoutPanelLeft size={isMobile ? 16 : 12} />
    </button>
  );
}

export function MenuBar() {
  const time = useTime();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [sleepActive, setSleepActive] = useState(false);
  const [shutdownActive, setShutdownActive] = useState(false);
  const [restartActive, setRestartActive] = useState(false);
  const lifecycle = useService<LifecycleService>('lifecycle');
  const calendarRef = useRef<HTMLDivElement>(null);
  const ccRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isMobile) return;
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
      if (ccRef.current && !ccRef.current.contains(e.target as Node)) {
        setControlCenterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMobile]);

  useEffect(() => {
    const unsubSleep = lifecycle.onSleep(() => setSleepActive(true));
    const unsubResume = lifecycle.onResume(() => setSleepActive(false));
    return () => {
      unsubSleep();
      unsubResume();
    };
  }, [lifecycle]);

  return (
    <>
      <header
        className={cn(
          'fixed left-0 right-0 top-0 z-50',
          isMobile ? 'h-12 px-2' : 'h-8 px-3',
          'flex items-center justify-between',
          'bg-background/30 backdrop-blur-xl',
          'border-border/50 border-b',
          'select-none',
        )}
        style={
          isMobile
            ? {
                paddingTop: 'env(safe-area-inset-top, 0px)',
                height: 'calc(48px + env(safe-area-inset-top, 0px))',
              }
            : undefined
        }
      >
        <div className="flex items-center gap-2">
          {/* Aruna logo */}
          <div className="relative">
            <button
              onClick={() => {
                setMenuOpen((p) => !p);
                setCalendarOpen(false);
                setControlCenterOpen(false);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-all',
                'text-sm font-semibold tracking-tight',
                menuOpen
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
              )}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-violet-500/10 blur-sm" />
                <img src="/logo.png" alt="ArunaOS" className="relative h-5 w-5" />
              </div>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                >
                  <AppleMenu
                    onClose={() => setMenuOpen(false)}
                    onAbout={() => setAboutOpen(true)}
                    onSleep={() => {
                      lifecycle.sleep();
                      setSleepActive(true);
                    }}
                    onRestart={() => {
                      lifecycle.shutdown();
                      setRestartActive(true);
                    }}
                    onShutdown={() => {
                      lifecycle.shutdown();
                      setShutdownActive(true);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Clock & Calendar */}
        <div className="flex items-center gap-1">
          {/* Widget Toggle */}
          <WidgetToggleButton isMobile={isMobile} />

          {/* Control Center */}
          <div className="relative" ref={ccRef}>
            <button
              onClick={() => {
                setControlCenterOpen((p) => !p);
                setMenuOpen(false);
                setCalendarOpen(false);
                setNotificationOpen(false);
              }}
              className={cn(
                'flex items-center justify-center rounded-md transition-colors',
                isMobile ? 'h-8 w-8' : 'h-6 w-6',
                controlCenterOpen
                  ? 'bg-muted text-foreground'
                  : 'text-foreground/60 hover:text-foreground hover:bg-muted/50',
              )}
              title="Control Center"
            >
              <Sliders size={isMobile ? 16 : 12} />
            </button>
            {isMobile ? null : (
              <AnimatePresence>
                {controlCenterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full z-[9999] mt-1"
                  >
                    <ControlCenterPopup onClose={() => setControlCenterOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Notification dots */}
          <NotificationIndicator
            open={isMobile ? notificationOpen : undefined}
            onToggle={isMobile ? () => setNotificationOpen((p) => !p) : undefined}
          />

          {/* Date/Time */}
          {mounted && (
            <div className="relative" ref={calendarRef}>
              <button
                onClick={() => {
                  setCalendarOpen((p) => !p);
                  setMenuOpen(false);
                  setControlCenterOpen(false);
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors',
                  calendarOpen
                    ? 'bg-muted text-foreground'
                    : 'text-foreground/80 hover:text-foreground hover:bg-muted/50',
                )}
              >
                {!isMobile && (
                  <span className="text-muted-foreground text-xs">{formatDate(time)}</span>
                )}
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    isMobile ? 'text-foreground/80 text-sm' : 'text-foreground/70 text-xs',
                  )}
                >
                  {formatTime(time)}
                </span>
              </button>

              <AnimatePresence>{calendarOpen && <CalendarPopup date={time} />}</AnimatePresence>
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {isMobile && controlCenterOpen && (
        <ControlCenterPopup onClose={() => setControlCenterOpen(false)} />
      )}
      {isMobile && notificationOpen && (
        <NotificationCenterPopup onClose={() => setNotificationOpen(false)} />
      )}

      <AnimatePresence>
        {aboutOpen && <AboutOverlay onClose={() => setAboutOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {sleepActive && (
          <SleepOverlay
            onWake={() => {
              lifecycle.resume();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{restartActive && <RestartOverlay />}</AnimatePresence>

      <AnimatePresence>
        {shutdownActive && (
          <ShutdownOverlay
            onRestart={() => {
              setShutdownActive(false);
              window.location.reload();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
