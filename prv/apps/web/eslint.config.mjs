import coreWebVitals from "eslint-config-next/core-web-vitals"

export default [
  ...coreWebVitals,
  {
    rules: {
      // React Compiler / react-hooks v6 rules that flag pervasive but legitimate
      // patterns in this codebase (client-only state init, fetch-in-effect,
      // ref-based positioning). Kept visible as warnings so they can be migrated
      // deliberately — without blocking CI on established, working patterns.
      // Genuine-correctness rules (rules-of-hooks, exhaustive-deps, immutability,
      // purity, error-boundaries) remain errors via the base config.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]
