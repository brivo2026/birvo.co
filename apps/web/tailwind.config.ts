import type { Config } from 'tailwindcss';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const birvoPreset = require('@birvo/ui/tailwind-preset');

const config: Config = {
  presets: [birvoPreset],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
