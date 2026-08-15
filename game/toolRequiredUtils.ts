/**
 * Modular tool-required checks for interactions (fishing, digging, bug catching).
 */
import { isBugNet, isFishingPole, isPickaxe, isShovel } from './equipConfig';
import { pickRandomMessage } from './fishingUtils';

export type InteractionTool = 'fishing' | 'digging' | 'bug_catching' | 'mining';

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

const NO_NET_MESSAGES = [
  "Oops — we need a net equipped first!",
  "Almost! Equip your bug net, then we can catch them.",
  "A little net would help a lot right now.",
  "Let's put on a net before we say hi to the bugs!",
  "Net first, catch second. You've got this!",
] as const;

const NO_PICKAXE_MESSAGES = [
  "I need a pickaxe for that!",
  "A pickaxe would help chip this open...",
  "Can't mine without a pickaxe equipped.",
  "If only I had a pickaxe!",
  "Let's equip a pickaxe first.",
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
  bug_catching: {
    check: isBugNet,
    messages: NO_NET_MESSAGES,
  },
  mining: {
    check: isPickaxe,
    messages: NO_PICKAXE_MESSAGES,
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
