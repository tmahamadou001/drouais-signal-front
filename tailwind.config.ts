import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A56A0',
          50: '#E8F0FA',
          100: '#C5D9F2',
          200: '#8FB3E5',
          300: '#5A8DD8',
          400: '#2E6FBF',
          500: '#1A56A0',
          600: '#154882',
          700: '#103A65',
          800: '#0B2C48',
          900: '#061E2B',
        },
        success: {
          DEFAULT: '#1D9E75',
          50: '#E6F7F1',
          100: '#C0EBD9',
          200: '#80D8B4',
          300: '#40C48F',
          400: '#1D9E75',
          500: '#17805F',
          600: '#126249',
          700: '#0D4433',
          800: '#08261D',
        },
        warning: {
          DEFAULT: '#EF9F27',
          50: '#FEF5E7',
          100: '#FDE6C0',
          200: '#FBCD81',
          300: '#F5B44E',
          400: '#EF9F27',
          500: '#D48810',
          600: '#A66B0C',
          700: '#784E08',
          800: '#4A3005',
        },
        neutral: {
          DEFAULT: '#F4F4F4',
          50: '#FAFAFA',
          100: '#F4F4F4',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        dark: '#1A1A1A',

        /**
         * La palette de l'export Claude Design — identique, valeur pour valeur,
         * à celle de l'app mobile (`mobile/tailwind.config.js`). C'est le même
         * produit vu par deux publics ; deux palettes qui dérivent l'une de
         * l'autre finiraient par se contredire sur la même capture d'écran.
         *
         * Elle s'ajoute à `primary`/`neutral` au lieu de les remplacer : les
         * huit autres pages d'administration s'appuient encore dessus, et les
         * refondre n'est pas le sujet de cette passe.
         */
        brand: {
          50:  '#F1F6FC',
          100: '#D6E4F5',
          200: '#B3CCEA',
          400: '#7C98BE',
          500: '#9FB6D4',
          700: '#1A56A0',
          800: '#14406F',
          900: '#0F2B4A',
        },
        canvas: '#F6F7F9',
        line: '#E2E5EA',
        /** Le trait entre deux lignes de table — plus clair que `line`. */
        hairline: '#EDEFF3',
        ink: '#111827',
        muted: '#6B7280',
        faint: '#9CA3AF',
        status: {
          'pending-bg': '#F1F1F2',
          'pending-fg': '#525252',
          'progress-bg': '#FEF6E7',
          'progress-fg': '#8A5A08',
          'progress-dot': '#EF9F27',
          'done-bg': '#E8F7F1',
          'done-fg': '#0F6B4E',
          success: '#1D9E75',
          'success-soft': '#7FD8B8',
          danger: '#DC2626',
          'danger-bg': '#FBEAEA',
        },
      },
      fontFamily: {
        // Charte §4 : l'admin web est en Instrument Sans, 400 à 700. La
        // transition est finie — Source Sans 3 tenait le reste de
        // l'administration en attendant, et Playfair Display était un reste de
        // la v1 que la charte ne mentionne plus.
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        // Conservé comme alias : vingt-deux fichiers portent `font-ui`, et le
        // faire disparaître d'un coup ne dirait rien de plus que `sans`.
        ui: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'ds': '8px',
        'ds-lg': '12px',
        'ds-xl': '16px',
      },
      boxShadow: {
        'ds': '0 1px 3px 0 rgba(26, 26, 26, 0.08), 0 1px 2px -1px rgba(26, 26, 26, 0.08)',
        'ds-md': '0 4px 6px -1px rgba(26, 26, 26, 0.08), 0 2px 4px -2px rgba(26, 26, 26, 0.06)',
        'ds-lg': '0 10px 15px -3px rgba(26, 26, 26, 0.08), 0 4px 6px -4px rgba(26, 26, 26, 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config
