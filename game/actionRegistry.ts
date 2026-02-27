import type { InteractAction } from './types';

export interface ActionContext {
  action: InteractAction;
  clearInteraction: () => void;
}

export type ActionHandler = (ctx: ActionContext) => void;

const handlers = new Map<string, ActionHandler>();

/**
 * Register a handler for a given action payload slug.
 * When an item with `interactAction.payload === slug` is activated,
 * the handler will be invoked.
 */
export function registerAction(slug: string, handler: ActionHandler): void {
  handlers.set(slug, handler);
}

/**
 * Attempt to execute a registered handler for the given action.
 * Returns true if a handler was found and executed, false otherwise.
 */
export function executeAction(action: InteractAction, clearInteraction: () => void): boolean {
  const slug = action.payload;
  if (!slug) return false;
  const handler = handlers.get(slug);
  if (!handler) return false;
  handler({ action, clearInteraction });
  return true;
}

/**
 * Check whether a handler is registered for the given slug.
 */
export function hasAction(slug: string): boolean {
  return handlers.has(slug);
}

/**
 * Remove a previously registered handler.
 */
export function unregisterAction(slug: string): void {
  handlers.delete(slug);
}
