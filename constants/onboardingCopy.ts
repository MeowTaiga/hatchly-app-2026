/**
 * Centralized onboarding copy — warm, playful, to-the-point.
 */

export const copy = {
  theme: {
    title: 'Light or dark?',
    subtitle: "Pick what feels right — you can always change it later",
  },
  accent: {
    title: 'Pick your favorite color',
    subtitle: "We'll use it to make Hatchly feel like yours",
  },
  verify: {
    title: "Shhh... we sent you a secret code",
    subtitle: (phone: string) => `Check your messages — it's waiting for you`,
    error: "Hmm, that code didn't work. Double-check and try again?",
    verifying: 'Verifying...',
    continue: 'Verify',
  },
  phone: {
    title: "What's your digits?",
    subtitle: "We'll text you a little secret code — no spam, promise",
    error: "Couldn't send the code. Give it another shot?",
    sending: 'Sending...',
    continue: 'Send Code',
  },
  phoneSignIn: {
    title: "Hey, you're back!",
    subtitle: "Same number as before — we'll send you right in",
  },
  name: {
    title: "What should we call you?",
    subtitle: "Your pet's gonna love saying your name",
  },
  personalityVibe: {
    title: "What's your vibe?",
    subtitle: "We'll find you a companion that gets you",
  },
  companionStyle: {
    title: "What kind of companion?",
    subtitle: "Your future BFF is almost ready to meet you",
  },
  gender: {
    title: "How do you identify?",
    subtitle: "Helps us personalize everything for you",
  },
  birthday: {
    title: "When's your birthday?",
    subtitle: "We'll use it to tailor your plan — no spam, we promise",
  },
  height: {
    title: "How tall are you?",
    subtitle: "Quick one — helps us nail your targets",
  },
  currentWeight: {
    title: "What do you weigh now?",
    subtitle: "No judgment — just a starting point!",
  },
  goalWeight: {
    title: "What's your goal weight?",
    subtitle: "We'll help you get there, one step at a time",
  },
  activityLevel: {
    title: "How active are you?",
    subtitle: "Be honest — we'll set goals that actually fit",
  },
  goals: {
    title: "What are your goals?",
    subtitle: "Pick as many as you want — we're here for it",
  },
  dietary: {
    title: "Any dietary preferences?",
    subtitle: "Totally optional — skip if none apply",
  },
  petName: {
    title: (petName: string) =>
      `Name your ${petName.charAt(0).toUpperCase() + petName.slice(1)}!`,
    subtitle: "Pick something special — you can change it anytime",
  },
  summary: {
    title: "You're all set!",
    subtitle: "Here's a quick peek at your profile",
  },
  verifyNoAccount: "No account found with this number. Try signing up instead!",
} as const;
