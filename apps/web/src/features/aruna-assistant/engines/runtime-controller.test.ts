import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RuntimeController } from './runtime-controller';

describe('RuntimeController', () => {
  let controller: RuntimeController;
  let mockGet: ReturnType<typeof vi.fn>;

  function makeContainer() {
    return { get: mockGet as (name: string) => unknown };
  }

  beforeEach(() => {
    controller = new RuntimeController();
    mockGet = vi.fn();
  });

  it('has all sub-controllers', () => {
    expect(controller.bridge).toBeTruthy();
    expect(controller.window).toBeTruthy();
    expect(controller.module).toBeTruthy();
    expect(controller.workspace).toBeTruthy();
    expect(controller.notification).toBeTruthy();
  });

  it('reports bridge disconnected initially', () => {
    expect(controller.bridge.status).toBe('disconnected');
  });

  it('connects and disconnects bridge', () => {
    controller.bridge.connect(makeContainer());
    expect(controller.bridge.status).toBe('connected');
    controller.bridge.disconnect();
    expect(controller.bridge.status).toBe('disconnected');
  });

  it('window.openWindow returns null when bridge not connected', async () => {
    const result = await controller.window.openWindow('arunaos.files');
    expect(result).toBeNull();
  });

  it('window.openWindow calls moduleWindow service when connected', async () => {
    const openMock = vi.fn().mockResolvedValue('window-1');
    mockGet.mockReturnValue({ openModule: openMock });
    controller.bridge.connect(makeContainer());
    const result = await controller.window.openWindow('arunaos.files');
    expect(result).toBe('window-1');
    expect(openMock).toHaveBeenCalledWith('arunaos.files', undefined);
  });

  it('module.load returns false when not connected', async () => {
    const result = await controller.module.load('arunaos.files');
    expect(result).toBe(false);
  });

  it('module.getStatus returns unknown when not connected', () => {
    expect(controller.module.getStatus('arunaos.files')).toBe('unknown');
  });

  it('module.getLoadedModules returns empty when not connected', () => {
    expect(controller.module.getLoadedModules()).toEqual([]);
  });

  it('module.search returns empty when not connected', () => {
    expect(controller.module.search('files')).toEqual([]);
  });

  it('workspace.getCurrent returns main as default', () => {
    expect(controller.workspace.getCurrent()).toBe('main');
  });

  it('workspace.getWorkspaces returns default list', () => {
    const workspaces = controller.workspace.getWorkspaces();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]!.id).toBe('main');
  });

  it('notification.send returns empty when not connected', async () => {
    const result = await controller.notification.send('Test', 'Hello');
    expect(result).toBe('');
  });

  it('notification.getActive returns empty when not connected', () => {
    expect(controller.notification.getActive()).toEqual([]);
  });

  it('notification.getImportantCount returns 0 when not connected', () => {
    expect(controller.notification.getImportantCount()).toBe(0);
  });

  it('init and destroy lifecycle', async () => {
    await controller.init();
    controller.bridge.connect(makeContainer());
    expect(controller.bridge.status).toBe('connected');
    controller.destroy();
    expect(controller.bridge.status).toBe('disconnected');
  });
});
