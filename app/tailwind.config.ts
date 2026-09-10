import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 取自 綠谷國際 LOGO 的深森林綠
        brand: {
          DEFAULT: "#1B4A3A",
          50: "#E9F2EE",
          100: "#CFE2D9",
          200: "#A3C7B7",
          300: "#6FA88F",
          400: "#3E8266",
          500: "#1B4A3A",
          600: "#163E30",
          700: "#112F25",
          800: "#0C221B",
          900: "#071410",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans TC",
          "PingFang TC",
          "Microsoft JhengHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
