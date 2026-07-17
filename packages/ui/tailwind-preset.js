/** Preset de Tailwind con la identidad visual de BIRVO. */
module.exports = {
  theme: {
    extend: {
      colors: {
        birvo: {
          blue: '#1E3A8A',
          purple: '#7C3AED',
          white: '#FFFFFF',
          gray: '#F5F7FB',
        },
      },
      fontFamily: {
        heading: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 2px 10px 0 rgba(30, 58, 138, 0.06)',
        card: '0 4px 20px 0 rgba(124, 58, 237, 0.08)',
      },
    },
  },
};
