/**
 * tailwind-config.js
 * Loaded right after the Tailwind CDN script on every page. This is the single
 * source of the CivicEvents+ colour palette for Tailwind utilities; css/styles.css
 * mirrors the same values as CSS variables for the component classes.
 *
 * Palette rules ("Kigali Civic Atlas"):
 *  - ink    #172F43  headings, navigation, footer, structural text
 *  - brand  civic blue #2463EB for primary buttons, links, active/selected states.
 *           The scale's 900 step is ink, so existing `text-brand-900` headings read as ink.
 *  - paper  #FFFFFF  page background (plain white)
 *  - coral  #D95745  graphics / large text only (fails AA for small text);
 *           use coral-text #B23F2F for small coral text.
 *  - maize  #F2C14E  backgrounds with ink text only (never as text on light surfaces)
 *  - sage   #E4ECE7  secondary surfaces, community categories
 */
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
        line: '#DDDCD3',
        sage: { DEFAULT: '#E4ECE7', 600: '#3F6B55' },
        coral: { DEFAULT: '#D95745', text: '#B23F2F', 50: '#FBECE9' },
        maize: { DEFAULT: '#F2C14E', 50: '#FDF5DF' },
        accent: '#D95745'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // Kept as an alias so existing `font-display` classes still work; Inter everywhere.
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      }
    }
  }
};
