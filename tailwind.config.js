/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#e0e7ff'
        },
        accent: {
          DEFAULT: '#10b981',
          light: '#d1fae5'
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7'
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#fee2e2'
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#dbeafe'
        },
        surface: {
          DEFAULT: '#ffffff',
          2: '#f8f9fc'
        },
        bg: '#f0f2f7',
        border: '#e2e6ef',
        muted: '#6b7280'
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Cascadia Code', 'Fira Code', 'Consolas', 'monospace']
      },
      borderRadius: {
        card: '12px',
        sm: '8px'
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
        md: '0 4px 12px rgba(0,0,0,.1)',
        lg: '0 10px 30px rgba(0,0,0,.12)'
      }
    }
  },
  plugins: []
};
