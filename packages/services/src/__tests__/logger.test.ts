import { describe, it, expect, vi } from 'vitest';
import { Logger } from '../logger';

describe('Logger', () => {
  it('should log messages in dev mode', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new Logger(true);
    logger.info('test', 'hello');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should filter by log level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = new Logger(true);
    logger.setLevel('warn');
    logger.debug('test', 'hidden');
    logger.info('test', 'hidden');
    logger.warn('test', 'shown');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toContain('WARN');
    spy.mockRestore();
  });

  it('should be silent in production for console', () => {
    const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new Logger(false);
    logger.debug('test', 'hidden');
    logger.info('test', 'hidden');
    logger.warn('test', 'hidden');
    logger.error('test', 'hidden');
    expect(spyLog).not.toHaveBeenCalled();
    expect(spyInfo).not.toHaveBeenCalled();
    expect(spyWarn).not.toHaveBeenCalled();
    expect(spyError).not.toHaveBeenCalled();
    spyLog.mockRestore();
    spyInfo.mockRestore();
    spyWarn.mockRestore();
    spyError.mockRestore();
  });

  it('should still buffer in production', () => {
    const logger = new Logger(false);
    logger.warn('test', 'shown');
    logger.error('test', 'err');
    expect(logger.getBuffer()).toHaveLength(2);
  });

  it('should buffer log entries', () => {
    const logger = new Logger(true);
    logger.info('mod', 'msg1');
    logger.warn('mod', 'msg2');
    const buffer = logger.getBuffer();
    expect(buffer).toHaveLength(2);
    expect(buffer[0]!.message).toBe('msg1');
    expect(buffer[1]!.message).toBe('msg2');
  });

  it('should limit buffer size', () => {
    const logger = new Logger(true);
    for (let i = 0; i < 150; i++) {
      logger.debug('mod', `msg${i}`);
    }
    expect(logger.getBuffer()).toHaveLength(100);
  });

  it('should clear buffer', () => {
    const logger = new Logger(true);
    logger.info('mod', 'msg');
    logger.clearBuffer();
    expect(logger.getBuffer()).toHaveLength(0);
  });

  it('should get snapshot of warn+ errors only', () => {
    const logger = new Logger(true);
    logger.info('mod', 'info');
    logger.warn('mod', 'warn');
    logger.error('mod', 'error');
    const snapshot = logger.getSnapshot();
    expect(snapshot).toHaveLength(2);
    expect(snapshot[0]!.level).toBe('warn');
    expect(snapshot[1]!.level).toBe('error');
  });

  it('should include timestamp in log entries', () => {
    const now = Date.now();
    const logger = new Logger(true);
    logger.info('mod', 'msg');
    const entry = logger.getBuffer()[0]!;
    expect(entry.timestamp).toBeGreaterThanOrEqual(now);
    expect(entry.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should include module name in log entries', () => {
    const logger = new Logger(true);
    logger.info('MyModule', 'msg');
    const entry = logger.getBuffer()[0]!;
    expect(entry.module).toBe('MyModule');
  });
});
