/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx,md,mdx}',
    './content/**/*.{js,jsx,ts,tsx,md,mdx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // OneKey Brand Green (primary)
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#00B812', // OneKey Brand Green
          600: '#00960E', // Hover state
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Stripe-inspired gray scale
        gray: {
          0: '#ffffff',
          50: '#f6f8fa',
          100: '#ebeef1',
          150: '#d5dbe1',
          200: '#c0c8d2',
          300: '#a3acba',
          400: '#87909f',
          500: '#687385',
          600: '#545969',
          700: '#414552',
          800: '#30313d',
          900: '#1a1b25',
          950: '#10111a',
        },
        dark: {
          bg: '#10111a',    // Stripe dark bg
          paper: '#1a1b25', // Stripe dark paper
        }
      },
      fontFamily: {
        sans: ['Stabil Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Stabil Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Geist Mono', 'Source Code Pro', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      // Stripe-inspired border radius (prefer smaller values)
      borderRadius: {
        'none': '0',
        'xs': '2px',
        'sm': '4px',     // Stripe default for buttons
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',     // Stripe default for cards
        'xl': '12px',
        '2xl': '16px',
        'full': '9999px',
      },
      // Stripe-inspired shadows
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'sm': '0px 1px 1px 0px rgba(0, 0, 0, 0.12), 0px 2px 5px 0px rgba(48, 49, 61, 0.08)',
        'md': '0px 3px 6px 0px rgba(0, 0, 0, 0.12), 0px 7px 14px 0px rgba(48, 49, 61, 0.08)',
        'lg': '0px 5px 15px 0px rgba(0, 0, 0, 0.12), 0px 15px 35px 0px rgba(48, 49, 61, 0.08)',
        'xl': '0px 5px 15px 0px rgba(0, 0, 0, 0.12), 0px 15px 35px 0px rgba(48, 49, 61, 0.08), 0px 50px 100px 0px rgba(48, 49, 61, 0.08)',
        'focus': '0 0 0 2px rgba(0, 184, 18, 0.3)', // OneKey green focus
        'focus-blue': '0 0 0 4px rgba(1, 150, 237, 0.36)', // Info focus
      },
      // Stripe-inspired transitions
      transitionDuration: {
        'fast': '50ms',
        'normal': '150ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'stripe': 'cubic-bezier(0, 0.09, 0.4, 1)',
      },
      // Stripe-inspired font sizes
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '30px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['32px', { lineHeight: '38px' }],
        '4xl': ['40px', { lineHeight: '46px' }],
        '5xl': ['48px', { lineHeight: '54px' }],
        '6xl': ['56px', { lineHeight: '62px' }],
      },
      // Stripe-inspired spacing (4px base unit)
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
      },
    }
  },
  plugins: [],
  darkMode: 'class'
}
