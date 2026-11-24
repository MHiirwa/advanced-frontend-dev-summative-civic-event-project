/**
 * tailwind-config.js
 * Loaded right after the Tailwind CDN script on every page. This is the single
 * source of the CivicEvents+ colour palette for Tailwind utilities; css/styles.css
 * mirrors the same values as CSS variables for the component classes.
 *
 * Design system rules (mirrored as CSS variables in css/styles.css):
 *  - Colour: ONE brand colour (civic blue #2463EB) with tints/shades, ink #172F43 for text,
 *    and semantic colours only for meaning: green = success, amber = warning, red = danger.
 *    Tailwind's red/amber/green/lime are remapped onto those tokens so every toast, alert
 *    and status uses the same three semantic colours. Retired accents (sage, coral, maize)
 *    are mapped onto brand/semantic values so existing class names keep working.
 *  - Type: 6 sizes (12/14/16/20/24/32). `text-lg` and `text-xl` share 20px; `text-3xl` is 32px.
 *  - Radius: 10px for small components (rounded-md/lg), 16px for cards (rounded-xl/2xl).
 *  - Shadows: soft and low-opacity; shadow-lg/2xl are the overlay (drawer, dialog) level.
 *  - Spacing: padding, margin, gap and space-* only use the 4/8 scale (4, 8, 12, 16, 24, 32, 48).
 *    Off-scale steps (0.5, 1.5, 2.5, 3.5, 5, 7, 9, 10, 11, 14, 16, 20) are snapped to the nearest
 *    scale value here, so markup in the JS stays on scale. Width/height keep Tailwind's sizes.
 */
var SNAP = {
  '0.5': '0.25rem', '1.5': '0.5rem', '2.5': '0.75rem', '3.5': '1rem', '5': '1.5rem', '7': '2rem',
  '9': '2rem', '10': '3rem', '11': '3rem', '14': '3rem', '16': '3rem', '20': '3rem'
};
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF3FE', 100: '#DCE7FD', 200: '#B9CEFA', 300: '#8DADF4', 400: '#5A88EF',
          500: '#3A72ED', 600: '#2463EB', 700: '#2463EB', 800: '#1B4FC2', 900: '#172F43'
        },
        ink: '#172F43',
        muted: '#4F5D6B',
        paper: '#FFFFFF',
        sand: '#FFFFFF',
        line: '#E3E7EC',
        'line-strong': '#858C96',
        canvas: '#F5F7FA',
        subtle: '#F3F5F8',
        // Semantic colours (contrast on their 50 tint: red 5.9:1, amber 5.9:1, green 4.9:1)
        red: { 50: '#FEECEB', 600: '#B42318', 700: '#B42318', 800: '#912018', 900: '#7A1A13' },
        amber: { 50: '#FDF5DF', 600: '#B7791F', 700: '#8A5A00', 800: '#704900', 900: '#5C3D00' },
        green: { 50: '#E6F4EC', 700: '#1E7A46', 800: '#17603A', 900: '#124D2F' },
        lime: { 800: '#1E7A46' },
        // Retired accents mapped onto the system (class names kept for compatibility)
        sage: { DEFAULT: '#EEF3FE', 600: '#1B4FC2' },
        coral: { DEFAULT: '#2463EB', text: '#B42318', 50: '#FEECEB' },  // coral-text = danger (notification count)
        maize: { DEFAULT: '#FFFFFF', 50: '#FDF5DF' },
        accent: '#2463EB'                                                // unread dot = brand
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '3xl': ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.025em' }],
        '4xl': ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.025em' }]
      },
      padding: SNAP, margin: SNAP, gap: SNAP, space: SNAP,
      borderRadius: { md: '0.625rem', lg: '0.625rem', xl: '1rem', '2xl': '1rem' },
      boxShadow: {
        sm: 'var(--shadow-sm)', DEFAULT: 'var(--shadow-sm)', md: 'var(--shadow)',
        lg: 'var(--shadow-lg)', xl: 'var(--shadow-lg)', '2xl': 'var(--shadow-lg)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // Kept as an alias so existing `font-display` classes still work; Inter everywhere.
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      }
    }
  }
};
