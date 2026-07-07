import coreWebVitals from "eslint-config-next/core-web-vitals"

const config = [
  ...coreWebVitals,
  {
    rules: {
      // set-state-in-effect and refs are at error (the base config default):
      // every data-loading effect has moved to TanStack Query and the few
      // genuinely effect-driven / ref-positioning cases carry an inline
      // eslint-disable with a documented reason, so new violations fail CI.
      //
      // preserve-manual-memoization stays a warning: it is a React Compiler
      // optimization advisory (one component the compiler declines to memoize),
      // not a correctness issue, so it should surface without failing the build.
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]

export default config
