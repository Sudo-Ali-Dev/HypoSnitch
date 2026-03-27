/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#13293d",
        cream: "#fdf6e3",
        coral: "#ef476f",
        mint: "#06d6a0",
        sun: "#ffd166",
      },
      boxShadow: {
        card: "0 18px 50px rgba(19, 41, 61, 0.18)",
      },
    },
  },
  plugins: [],
};
