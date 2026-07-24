import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** Flat config for ESLint 9 / Next 16 (native flat configs from eslint-config-next). */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "drizzle/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
