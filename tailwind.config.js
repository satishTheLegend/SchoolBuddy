/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0B0F19',
          elevated: '#141A2A',
          card: '#1A2236',
        },
        ink: {
          DEFAULT: '#F4F6FB',
          muted: '#8C97B5',
          dim: '#5B6580',
        },
        accent: {
          DEFAULT: '#7C5CFF',
          soft: '#A491FF',
        },
        success: '#3BD179',
        warning: '#FFB547',
        danger: '#FF5E73',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
