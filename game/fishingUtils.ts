/**
 * Shared fishing utilities (no-pole messages, etc.).
 */

export const NO_POLE_MESSAGES = [
  "I wish I had a fishing pole...",
  "Maybe I should get a rod first.",
  "A fishing pole would be really helpful right now!",
  "I can't fish without a pole...",
  "If only I had a fishing pole!",
] as const;

export function pickRandomMessage<T extends readonly string[]>(messages: T): T[number] {
  return messages[Math.floor(Math.random() * messages.length)];
}
