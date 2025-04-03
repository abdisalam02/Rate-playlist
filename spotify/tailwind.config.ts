// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in-out': 'fadeInOut 3s ease-in-out',
        'music-wave-1': 'musicWave1 1s ease-in-out infinite',
        'music-wave-2': 'musicWave2 1.1s ease-in-out infinite',
        'music-wave-3': 'musicWave3 0.9s ease-in-out infinite',
        'music-wave-4': 'musicWave4 1.2s ease-in-out infinite',
        'music-wave-5': 'musicWave5 0.8s ease-in-out infinite',
      },
      keyframes: {
        fadeInOut: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '10%': { opacity: '1', transform: 'translateY(0)' },
          '90%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-20px)' },
        },
        musicWave1: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '12px' },
        },
        musicWave2: {
          '0%, 100%': { height: '6px' },
          '25%': { height: '14px' },
          '75%': { height: '4px' },
        },
        musicWave3: {
          '0%, 100%': { height: '8px' },
          '35%': { height: '16px' },
          '65%': { height: '6px' },
        },
        musicWave4: {
          '0%, 100%': { height: '10px' },
          '45%': { height: '8px' },
          '65%': { height: '18px' },
        },
        musicWave5: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '10px' },
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      "light",
      "dark",
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
    ],
  },
} satisfies Config;
