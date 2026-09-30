/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wa: {
          teal: '#00a884',
          tealDark: '#008069',
          bg: '#0b141a',
          sidebar: '#111b21',
          header: '#202c33',
          panel: '#182229',
          bubbleOut: '#005c4b',
          bubbleIn: '#202c33',
          textPrimary: '#e9edef',
          textSecondary: '#8696a0',
          input: '#2a3942',
        },
      },
    },
  },
  plugins: [],
};

