import type { PluginAPI } from './types.js';
import { registerAllTools } from './tools/register.js';

export const id = 'athena';
export const name = 'Athena - Strategic Career Engineer';

export function register(api: PluginAPI) {
  registerAllTools(api);
  console.log('[Athena] Plugin loaded successfully');
}
