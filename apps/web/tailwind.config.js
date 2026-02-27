/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // RGR Navy scale (from logo)
        navy: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#8b9ff8',
          500: '#6b7ef2',
          600: '#4f5de6',
          700: '#3b4acb',
          800: '#1e3a8a',  // Logo navy
          900: '#0f1f4d',  // Logo dark navy
          950: '#0a1433',  // Logo darkest
        },

        // Electric cyan scale (from logo highlights)
        electric: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',  // Logo electric cyan - success states
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },

        // Chrome/metallic scale (from logo borders)
        chrome: {
          50: '#f8fafc',   // Logo highlight - white text
          100: '#f1f5f9',
          200: '#e2e8f0',  // Logo light chrome - borders
          300: '#cbd5e1',
          400: '#94a3b8',  // Logo mid chrome - muted text
          500: '#64748b',
          600: '#475569',  // Logo dark chrome - borders
          700: '#334155',
          800: '#1e293b',  // Logo chrome shadow
          900: '#0f172a',
        },

        // Brand color scale (primary blue - RGR colors)
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',  // Logo bright blue
          500: '#3b82f6',  // Logo vibrant blue - DEFAULT
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a8a',  // Logo navy
          900: '#1e40af',
          950: '#172554',
          DEFAULT: '#3b82f6',
        },

        // Status colors - semantic UI states
        success: {
          DEFAULT: '#2dd4bf',  // Electric cyan
          light: '#35d28a',
          dark: '#01955f',
        },
        warning: {
          DEFAULT: '#f59e0b',  // Amber
          light: '#ffcd75',
          dark: '#B45309',
        },
        error: {
          DEFAULT: '#ef4444',  // Red
          light: '#ee5d50',
          dark: '#c41616',
        },
        info: {
          DEFAULT: '#3b82f6',  // Vibrant blue
          light: '#21d4fd',
          dark: '#0060cc',
        },

        // Vision UI text colors (for backward compatibility)
        'vision-text': {
          primary: '#ffffff',
          secondary: '#a0aec0',
          muted: '#718096',
        },

        // Vision UI border colors (for backward compatibility)
        'vision-border': {
          DEFAULT: '#56577a',
          light: 'rgba(226, 232, 240, 0.3)',
        },
      },

      backgroundImage: {
        // RGR Logo gradients
        'rgr-logo-vertical': 'linear-gradient(to bottom, #60a5fa 0%, #1e3a8a 50%, #0a1433 100%)',
        'rgr-chrome': 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 50%, #475569 100%)',
        'rgr-blue-glow': 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',

        // Background gradients
        'rgr-dark': 'linear-gradient(to bottom, #172554 0%, #172554 20%, #0c1e3d 50%, #060f1f 85%, #010409 100%)',
        'rgr-light': 'linear-gradient(to bottom, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)',

        // Vision UI gradients (for backward compatibility)
        'vision-gradient': 'linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
        'vision-card': 'linear-gradient(127.09deg, rgba(30, 58, 138, 0.75) 0%, rgba(6, 11, 40, 0.94) 40%, rgba(10, 14, 35, 0.49) 100%)',
        'vision-sidenav': 'linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
        'vision-main': 'linear-gradient(159.02deg, #0f123b 14.25%, #090d2e 56.45%, #020515 86.14%)',

        // Stat card gradients
        'vision-brand': 'linear-gradient(310deg, #4318ff 0%, #9f7aea 100%)',
        'vision-info': 'linear-gradient(310deg, #0075ff 0%, #21d4fd 100%)',
        'vision-success': 'linear-gradient(310deg, #01b574 0%, #35d28a 100%)',
        'vision-warning': 'linear-gradient(310deg, #ffb547 0%, #ffcd75 100%)',
        'vision-error': 'linear-gradient(310deg, #e31a1a 0%, #ee5d50 100%)',
        'vision-dark': 'linear-gradient(310deg, #141727 0%, #3a416f 100%)',
        'vision-menu': 'linear-gradient(310deg, #05153f 0%, #072561 100%)',
      },

      boxShadow: {
        // RGR theme shadows
        'rgr-card-dark': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 130, 246, 0.1)',
        'rgr-card-light': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'rgr-glow': '0 0 20px rgba(0, 117, 255, 0.3)',
        'rgr-brand': '0 4px 7px -1px rgba(0, 117, 255, 0.4), 0 2px 4px -2px rgba(0, 117, 255, 0.2)',

        // Vision UI shadows (for backward compatibility)
        'vision': '0 7px 23px rgba(0, 0, 0, 0.05)',
        'vision-lg': '0 20px 27px rgba(0, 0, 0, 0.05)',
        'vision-card': '0 7px 23px rgba(0, 0, 0, 0.15)',
        'vision-glow': '0 0 20px rgba(0, 117, 255, 0.3)',
        'vision-brand': '0 4px 7px -1px rgba(0, 117, 255, 0.4), 0 2px 4px -2px rgba(0, 117, 255, 0.2)',
      },

      borderRadius: {
        'rgr': '1.25rem',    // 20px - standard RGR card radius
        'rgr-sm': '0.75rem', // 12px - small elements
        'vision': '20px',     // Vision UI standard (for backward compatibility)
        'vision-lg': '24px',
      },

      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'meteor-effect': 'meteor 5s linear infinite',
        'beam-fall': 'beamFall 8s linear infinite',
        'explosion-fade': 'explosionFade 2s ease-out forwards',
        'explosion-move': 'explosionMove 2s ease-out forwards',
      },

      transitionDuration: {
        'theme': '600ms',
      },

      transitionTimingFunction: {
        'theme': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 117, 255, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 117, 255, 0.6)' },
        },
        meteor: {
          '0%': { transform: 'translateX(0) translateY(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': {
            transform: 'translateX(-120vw) translateY(50vh)',
            opacity: '0',
          },
        },
        beamFall: {
          '0%': { transform: 'translateY(-200px)' },
          '100%': { transform: 'translateY(calc(100vh + 200px))' },
        },
        explosionFade: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        explosionMove: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(var(--tw-translate-x), var(--tw-translate-y)) scale(0)' },
        },
      },

      fontFamily: {
        'vision': ['Plus Jakarta Sans', 'Helvetica', 'sans-serif'],
      },

      // Spacing specifically for top nav
      spacing: {
        'topnav': '66px',
      },
    },
  },
  plugins: [
    require('tailwindcss-motion')],
};
