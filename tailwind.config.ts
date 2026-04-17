import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        paper: "#f8fafc",
        accent: {
          DEFAULT: "#f97316",
          dark: "#ea580c",
          soft: "#ffedd5"
        },
        teal: "#0f766e",
        berry: "#9f1239"
      },
      boxShadow: {
        card: "0 18px 40px rgba(15, 23, 42, 0.12)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: [forms]
};

export default config;
