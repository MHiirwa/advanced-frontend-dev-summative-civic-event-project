/**
 * tailwind-config.js
 * Loaded right after the Tailwind CDN script. Defines the CivicEvents+ theme:
 * a deep civic green, warm sand background, and a serif display font for headings.
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf4f1', 100: '#dceae3', 200: '#b7cfc3', 300: '#8daf9f', 400: '#5f917e',
          500: '#39735f', 600: '#10483d', 700: '#10483d', 800: '#0b352e', 900: '#082922'
        },
        sand: '#f8f6f0',
        ink: '#1d2d29',
        muted: '#65756f',
        accent: '#f39a32'
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Libre Baskerville"', 'Georgia', 'serif']
      }
    }
  }
};
