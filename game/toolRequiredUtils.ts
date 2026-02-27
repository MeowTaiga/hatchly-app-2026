/**
 * Modular tool-required checks for interactions (fishing, digging, etc.).
 */
import { isFishingPole, isShovel } from './equipConfig';
import { pickRandomMessage } from './fishingUtils';

export type InteractionTool = 'fishing' | 'digging';

const NO_SHOVEL_MESSAGES = [
  "I need a shovel to dig that up!",
  "A shovel would help here...",
  "I can't dig without a shovel!",
  "If only I had a shovel!",
  "A shovel would be really helpful right now!",
] as const;

const NO_POLE_MESSAGES = [
  "I wish I had a fishing pole...",
  "Maybe I should get a rod first.",
  "A fishing pole would be really helpful right now!",
  "I can't fish without a pole...",
  "If only I had a fishing pole!",
] as const;

const TOOL_CONFIG: Record<
  InteractionTool,
  {
    check: (itemType: string | undefined, itemDefs: Record<string, { subCategory?: string }>) => boolean;
    messages: readonly string[];
  }
> = {
  fishing: {
    check: isFishingPole,
    messages: NO_POLE_MESSAGES,
  },
  digging: {
    check: isShovel,
    messages: NO_SHOVEL_MESSAGES,
  },
};

export function hasRequiredTool(
  interaction: InteractionTool,
  equipped: { handTool?: string } | undefined,
  itemDefs: Record<string, { subCategory?: string }>,
): boolean {
  const handTool = equipped?.handTool;
  if (!handTool) return false;
  return TOOL_CONFIG[interaction].check(handTool, itemDefs);
}

export function getNoToolMessage(interaction: InteractionTool): string {
  return pickRandomMessage(TOOL_CONFIG[interaction].messages);
}
