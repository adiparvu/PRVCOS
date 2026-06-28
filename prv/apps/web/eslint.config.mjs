import coreWebVitals from "eslint-config-next/core-web-vitals"

export default [
  ...coreWebVitals,
  {
    rules: {
      // set-state-in-effect is back to error: every data-loading effect has been
      // migrated to TanStack Query, and the few genuinely effect-driven cases
      // (client clocks, localStorage hydration, realtime-backed fetches) carry an
      // inline eslint-disable with a documented reason, so new violations fail CI.
      //
      // refs / preserve-manual-memoization stay warnings for now: the remaining
      // cases are ref-based positioning reads during render that need a deliberate
      // measure-into-state refactor rather than a blanket change.
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]
