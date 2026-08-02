import type { Instrumentation } from "next"

export async function register() {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    // Validate all required environment variables at startup.
    // Fails fast on misconfiguration rather than at first use.
    const { validateServerEnv, validateClientEnv } = await import("@prv/env")
    validateServerEnv(process.env)

    // The NEXT_PUBLIC_* vars are consumed with non-null assertions in
    // middleware.ts and lib/supabase/*. Without this check a typo produced a
    // server that booted green and then threw on EVERY request — the exact
    // failure the fail-fast intent above exists to prevent.
    validateClientEnv(process.env)

    // A deployment served over https that is not NODE_ENV=production ships
    // session cookies WITHOUT the Secure flag (nine auth routes gate `secure`
    // on it) and leaks the raw invite token in an API response. Refuse to
    // start rather than run a subtly insecure production server.
    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? ""
    if (appUrl.startsWith("https://") && process.env["NODE_ENV"] !== "production") {
      throw new Error(
        `NODE_ENV must be "production" when NEXT_PUBLIC_APP_URL is https (got "${process.env["NODE_ENV"]}") — ` +
          "session cookies would ship without the Secure flag."
      )
    }

    const Sentry = await import("@sentry/nextjs")
    Sentry.init({
      dsn: process.env["SENTRY_DSN"],
      environment: process.env["NODE_ENV"],
      tracesSampleRate: process.env["NODE_ENV"] === "production" ? 0.1 : 1.0,
      beforeSend(event) {
        if (event.user) {
          delete event.user.email
          delete event.user.ip_address
        }
        return event
      },
    })
  }

  if (process.env["NEXT_RUNTIME"] === "edge") {
    const Sentry = await import("@sentry/nextjs")
    Sentry.init({
      dsn: process.env["SENTRY_DSN"],
      environment: process.env["NODE_ENV"],
      tracesSampleRate: process.env["NODE_ENV"] === "production" ? 0.1 : 1.0,
    })
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const Sentry = await import("@sentry/nextjs")

  Sentry.captureRequestError(err, request, context)
}
