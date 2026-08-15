/**
 * Short tips shown while a scene loads. Mix of gameplay and wellness nudges.
 */

export const LOADING_TIPS: readonly string[] = [
  // ── Fishing ──────────────────────────────────────────────────────────────
  'You can fish in any body of water — if you have a fishing rod!',
  'Different waters hide different fish. Try rivers, ponds, and the ocean.',
  'Equip bait before you cast to improve your odds at rarer catches.',
  'A bobber is more than decoration — pick one you like and cast away.',
  'Timing the fishing mini-game well lands bigger, better fish.',
  'Sell spare fish at the shop, or cook them into something tasty.',
  'Check the Fishing Shop for poles, bait, and bobbers.',
  'Some fish only bite at certain times of day — come back later!',
  'Legendary fish are rare. Patience (and good gear) pays off.',
  'Caught something new? It shows up in your Bestiary automatically.',

  // ── Tools & gathering ────────────────────────────────────────────────────
  'You can go mining if you have a pickaxe equipped.',
  'Chop down trees with an axe to get different types of wood!',
  'Equip tools from your backpack before you need them.',
  'Shaking fruit trees can drop snacks — and sometimes surprise bugs.',
  'Dig spots on the farm may hide fossils and other treasures.',
  'Water your crops regularly so they grow on schedule.',
  'Plant seeds in soil plots — different crops take different times.',
  'Harvest ripe crops for coins, cooking ingredients, or quests.',
  'Keep a spare axe handy. Trees grow back over time.',
  'Some materials only come from chopping, mining, or fishing.',

  // ── Farming & building ───────────────────────────────────────────────────
  'Place decorations to make your farm feel like home.',
  'Buildings and shops open when you tap them in town.',
  'Use Edit Mode to rearrange items on your farm grid.',
  'Soil plots are where the magic (and the veggies) happen.',
  'Fences auto-connect when you place them next to each other.',
  'Upgrade your farm when quests and XP say you’re ready.',
  'Food dishes can hold meals for your pet to snack on later.',
  'The sell box turns spare goods into coins.',
  'Crafted food restores your pet’s hunger and happiness.',
  'Visit multiplayer scenes to meet friends and share the world.',

  // ── Pets & care ──────────────────────────────────────────────────────────
  'Pet your buddy often — they love the attention.',
  'Keep hunger, happy, and mood bars healthy for a thriving pet.',
  'A well-fed pet is a happier adventuring partner.',
  'Chairs and toys make downtime on the farm cozier.',
  'Your pet’s pose changes with how they’re feeling.',
  'Talk to NPCs — they often have quests and tips.',
  'Quest bubbles above NPCs mean they have something for you.',
  'Finish quests for rewards, XP, and new things to unlock.',
  'Check your Bestiary to see fish, bugs, and fossils you’ve found.',
  'Friends can visit shared scenes — say hi in chat!',

  // ── Exploration & social ─────────────────────────────────────────────────
  'Tap the ground to walk. Pathfinding will find a route for you.',
  'Unwalkable tiles block the path — go around!',
  'Fishing tiles sparkle when you’re ready to cast.',
  'Walk behind tall live scenery — depth is part of the charm.',
  'Town shops refresh stock, so stop by again later.',
  'Mail can bring gifts, news, and surprises.',
  'Equip a chair and take a breather between chores.',
  'Bugs spawn around the farm — catch them for the collection.',
  'Balloons sometimes float by with mystery loot.',
  'Night falls in the world — some critters prefer the dark.',

  // ── Health: logging food, weight, mood ───────────────────────────────────
  'Log your meals in Health — small notes add up to big insight.',
  'Tracking what you eat helps you spot patterns over time.',
  'A quick food log after lunch beats trying to remember at midnight.',
  'You don’t need perfect entries — honest ones are enough.',
  'Logging snacks counts too. Your future self will thank you.',
  'Check your Health tab to see how the week is shaping up.',
  'Logging weight regularly makes trends easier to see.',
  'Weigh-ins work best at a consistent time of day.',
  'Progress isn’t only the number — habits matter more.',
  'Celebrate non-scale wins: energy, sleep, and how clothes feel.',

  // ── Health: mood & wellbeing ─────────────────────────────────────────────
  'Log your mood — even a one-tap check-in helps.',
  'Noticing how you feel is a skill. The mood log trains it.',
  'Tough day? Logging it still counts as taking care of yourself.',
  'Mood trends over weeks tell a clearer story than one afternoon.',
  'Pair a mood log with a short note about what happened.',
  'Your pet’s care reminders are a nudge — you’re part of the team too.',
  'Hydration tip: a glass of water before coffee is a gentle win.',
  'Short walks count. Movement doesn’t have to be a whole workout.',
  'Stretch for a minute between farm chores IRL — shoulders will thank you.',
  'Sleep tips start with a wind-down: screens down a bit earlier helps.',

  // ── Health: habits & mindset ─────────────────────────────────────────────
  'Consistency beats intensity. Tiny daily logs beat rare perfect ones.',
  'Missed a day of logging? Just pick up today — no guilt required.',
  'Set a reminder if it helps you remember to check in.',
  'Health data stays yours — use it to learn, not to judge.',
  'Balanced plates are more sustainable than all-or-nothing rules.',
  'Protein, fiber, and color on the plate is a simple compass.',
  'Cravings happen. Logging them without shame is still progress.',
  'Share wins with a friend — accountability can be kind.',
  'If you’re overwhelmed, log just mood today. One tap is enough.',
  'Rest days are part of caring for yourself, not a setback.',

  // ── Mixed game + life ───────────────────────────────────────────────────
  'Play a little, log a little — Hatchly is built for both.',
  'Caught a rare fish? Stretch, sip water, then cast again.',
  'Quest complete IRL: drink water and log how you feel.',
  'Your farm grows with patience — so do healthy habits.',
  'Try one new vegetable this week — in-game and on your plate.',
  'A tidy farm and a tidy log both start with one small action.',
  'When in doubt, talk to an NPC… or write a short mood note.',
  'Exploration tip: the edges of town often hide cozy scenery.',
  'Keep an eye on equipped tools before you head out fishing.',
  'Thank yourself for showing up — in the game and in your health log.',
];

export function pickLoadingTip(rng: () => number = Math.random): string {
  return LOADING_TIPS[Math.floor(rng() * LOADING_TIPS.length)]!;
}
