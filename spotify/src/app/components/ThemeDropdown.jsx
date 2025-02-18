'use client';

import { useState, useEffect } from 'react';

// Expanded list of DaisyUI themes.
const themes = [
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
  "sunset"
];

export default function ThemeToggleButton() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") || "light";
    setTheme(storedTheme);
    document.documentElement.setAttribute("data-theme", storedTheme);
  }, []);

  const toggleTheme = () => {
    // Pick a random theme different from the current one
    const availableThemes = themes.filter(t => t !== theme);
    const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    setTheme(randomTheme);
    document.documentElement.setAttribute("data-theme", randomTheme);
    localStorage.setItem("theme", randomTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-lg flex items-center gap-2"
      aria-label="Toggle Random Theme"
    >
      {/* New palette icon */}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 3.133 1.58 5.88 4 7.65v-5.15a3.5 3.5 0 013.5-3.5h1a3.5 3.5 0 013.5 3.5v5.15C20.42 17.88 22 15.133 22 12c0-5.523-4.477-10-10-10zM8 13a1 1 0 100-2 1 1 0 000 2zm4-4a1 1 0 100-2 1 1 0 000 2zm3 7a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
      <span className="text-lg">Toggle Theme</span>
    </button>
  );
}
