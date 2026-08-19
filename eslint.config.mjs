import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  ignores: [
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "functions/**",
    "scripts/**",
    "next-env.d.ts",
  ],
}, {
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    }],
  },
}, {
  // Φράχτης του design system.
  // Το UI είχε ξεφύγει σε 131 στοιχεία κάτω από 11px, 907 font-black και
  // 846 uppercase. Οι κανόνες κρατούν την τυπογραφία στην κλίμακα.
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": ["error",
      {
        selector: "Literal[value=/\\btext-\\[\\d+px\\]/]",
        message:
          "Αυθαίρετο μέγεθος κειμένου. Χρησιμοποίησε την κλίμακα: text-2xs (12px), text-xs (13px), text-sm (14px), text-base (15px) ή μεγαλύτερο.",
      },
      {
        selector: "TemplateElement[value.raw=/\\btext-\\[\\d+px\\]/]",
        message:
          "Αυθαίρετο μέγεθος κειμένου. Χρησιμοποίησε την κλίμακα: text-2xs (12px), text-xs (13px), text-sm (14px), text-base (15px) ή μεγαλύτερο.",
      },
      {
        selector: "Literal[value=/\\bfont-black\\b/]",
        message:
          "Το font-black (900) ισοπεδώνει την ιεραρχία. Χρησιμοποίησε font-semibold για UI και font-bold για επικεφαλίδες.",
      },
    ],
  },
}, {
  // Ο κανόνας contrast αφορά τις ΛΕΥΚΕΣ επιφάνειες της εφαρμογής.
  // Οι σκούρες marketing σελίδες χρειάζονται αντίστροφη κλίμακα.
  files: ["src/app/management/**/*.tsx", "src/app/book/**/*.tsx", "src/app/coach/**/*.tsx"],
  rules: {
    "no-restricted-syntax": ["error", {
      selector: "Literal[value=/\\btext-zinc-[23]00\\b/]",
      message:
        "text-zinc-200/300 σε λευκό δίνει 1.2–1.5:1 — αποτυγχάνει WCAG AA. Χρησιμοποίησε text-zinc-500 για δευτερεύον κείμενο.",
    }],
  },
}];

export default eslintConfig;
