import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        golf: {
          green: {
            50: "#f0f7f0",
            100: "#d4e8d4",
            600: "#0f3d24",
            700: "#0a2e1f",
            800: "#08251a",
            900: "#051b14",
          },
          gold: "#c5a36f",
          goldLight: "#d9c38f",
          cream: "#f5f3eb",
        },
      },
    },
  },
  plugins: [],
};
export default config;
