/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "chat-background": "url('/chat-bg.png')",
      },
      colors: {
        secondary: "#8696a0",
        "teal-light": "#7ae3c3",
        "photopicker-overlay-background": "rgba(30,42,49,0.8)",
        "dropdown-background": "#233138",
        "dropdown-background-hover": "#182229",
        "input-background": "#2a3942",
        "primary-strong": "#e9edef",
        "panel-header-background": "#202c33",
        "panel-header-icon": "#aebac1",
        "icon-lighter": "#8696a0",
        "icon-green": "#00a884",
        "search-input-container-background": "#111b21",
        "conversation-border": "rgba(134,150,160,0.15)",
        "conversation-panel-background": "#0b141a",
        "background-default-hover": "#202c33",
        "incoming-background": "#202c33",
        "outgoing-background": "#005c4b",
        "bubble-meta": "hsla(0,0%,100%,0.6)",
        "icon-ack": "#53bdeb",
        'chat-bg': '#0b141a',
        'panel-bg': '#111b21',
      },
      gridTemplateColumns: {
        main: "1fr 2.4fr",
      },
      keyframes: {
        "progress-loading": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: { // اليسار (للـ Settings/Profile)
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        "progress-loading": "progress-loading 2s infinite linear",
        "slide-down": "slide-down 0.3s ease-out forwards",
        "slide-up": "slide-up 0.3s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-in-out forwards",
        'sidebar-slide': 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'sidebar-left-slide': 'slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
    },
  },
  plugins: [],
};