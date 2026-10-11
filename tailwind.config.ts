import type { Config } from 'tailwindcss';

/** `hsl(var(--x) / <alpha>)` so opacity modifiers like `bg-primary/90` work. */
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'media',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
        // Semantic palette: solid fill / soft tint (badges, backgrounds) / ink (readable text).
        groom: { DEFAULT: token('groom'), soft: token('groom-soft'), ink: token('groom-ink') },
        bride: { DEFAULT: token('bride'), soft: token('bride-soft'), ink: token('bride-ink') },
        shared: { DEFAULT: token('shared'), soft: token('shared-soft'), ink: token('shared-ink') },
        success: {
          DEFAULT: token('success'),
          soft: token('success-soft'),
          ink: token('success-ink'),
        },
        hero: { from: token('hero-from'), to: token('hero-to') },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
