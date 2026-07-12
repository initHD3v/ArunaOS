import type { AITool, AIToolResult } from '../types';

export function createSystemInfoTool(): AITool {
  return {
    id: 'get_system_info',
    name: 'get_system_info',
    description:
      'Get information about the current system state including OS, platform, and resources',
    category: 'system',
    parameters: [],
    async execute(): Promise<AIToolResult> {
      return {
        success: true,
        data: {
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'server',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          language: typeof navigator !== 'undefined' ? navigator.language : 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: Date.now(),
        },
      };
    },
  };
}

export function createOpenAppTool(): AITool {
  return {
    id: 'open_app',
    name: 'open_app',
    description: 'Open an application or module by its ID',
    category: 'system',
    parameters: [
      {
        name: 'appId',
        type: 'string',
        description:
          'The ID of the application to open (e.g., "arunaos.files", "arunaos.settings")',
        required: true,
      },
    ],
    async execute(params): Promise<AIToolResult> {
      const appId = String(params.appId ?? '');
      if (!appId) {
        return { success: false, error: 'appId is required' };
      }
      return {
        success: true,
        data: { action: 'open_app', appId, message: `Opening ${appId}` },
      };
    },
  };
}

export function createSearchTool(): AITool {
  return {
    id: 'search',
    name: 'search',
    description: 'Search for files, modules, settings, or any content in the system',
    category: 'search',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The search query',
        required: true,
      },
      {
        name: 'category',
        type: 'string',
        description: 'Category to search in (files, modules, settings, apps)',
        enum: ['files', 'modules', 'settings', 'apps', 'all'],
      },
    ],
    async execute(params): Promise<AIToolResult> {
      const query = String(params.query ?? '');
      if (!query) {
        return { success: false, error: 'query is required' };
      }
      return {
        success: true,
        data: { action: 'search', query, category: params.category ?? 'all' },
      };
    },
  };
}

export function createGetSystemContextTool(): AITool {
  return {
    id: 'get_system_context',
    name: 'get_system_context',
    description:
      'Get the current system context including active windows, workspace state, theme, and modules',
    category: 'system',
    parameters: [],
    async execute(): Promise<AIToolResult> {
      return {
        success: true,
        data: { action: 'get_system_context' },
      };
    },
  };
}

export function createNotifyTool(): AITool {
  return {
    id: 'notify',
    name: 'notify',
    description: 'Send a desktop notification to the user',
    category: 'system',
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: 'Notification title',
        required: true,
      },
      {
        name: 'message',
        type: 'string',
        description: 'Notification message body',
        required: true,
      },
      {
        name: 'type',
        type: 'string',
        description: 'Notification type',
        enum: ['info', 'success', 'warning', 'error'],
      },
    ],
    async execute(params): Promise<AIToolResult> {
      return {
        success: true,
        data: {
          action: 'notify',
          title: params.title,
          message: params.message,
          type: params.type ?? 'info',
        },
      };
    },
  };
}

export function createExecuteCommandTool(): AITool {
  return {
    id: 'execute_command',
    name: 'execute_command',
    description: 'Execute a system command or action (like opening settings, toggling theme, etc.)',
    category: 'system',
    parameters: [
      {
        name: 'command',
        type: 'string',
        description: 'The command to execute',
        required: true,
      },
      {
        name: 'params',
        type: 'object',
        description: 'Optional parameters for the command',
      },
    ],
    async execute(params): Promise<AIToolResult> {
      return {
        success: true,
        data: { action: 'execute_command', command: params.command, params: params.params },
      };
    },
  };
}

export function createModuleGeneratorTool(): AITool {
  return {
    id: 'generate_module',
    name: 'generate_module',
    description:
      'Generate a new ArunaOS module based on a description. Returns the module code, manifest, and file structure.',
    category: 'module',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Name of the module',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: 'Description of what the module does',
        required: true,
      },
      {
        name: 'capabilities',
        type: 'array',
        description: 'List of capabilities the module should have',
      },
    ],
    async execute(params): Promise<AIToolResult> {
      return {
        success: true,
        data: {
          action: 'generate_module',
          name: params.name,
          description: params.description,
        },
      };
    },
  };
}

export function getDefaultTools(): AITool[] {
  return [
    createSystemInfoTool(),
    createOpenAppTool(),
    createSearchTool(),
    createGetSystemContextTool(),
    createNotifyTool(),
    createExecuteCommandTool(),
    createModuleGeneratorTool(),
  ];
}
