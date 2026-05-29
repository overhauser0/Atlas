import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  // src配下のファイルをすべてTailwindの読み取り対象にする設定
  content: [
    './src/components/*.{js,ts,jsx,tsx,mdx}',
    './src/app/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.amber,
      },
    },
  },
  plugins: [],
};
export default config;
