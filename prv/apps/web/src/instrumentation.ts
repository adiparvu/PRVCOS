import type { Instrumentation } from "next"

export async function register() {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    const Sentry = await import("@sentry/nextjs")

    Sentry.init({
      dsn: process.env["SENTRY_DSN"],
      environment: process.env["NODE_ENV"],
      tracesSampleRate: process.env["NODE_ENV"] === "production" ? 0.1 : 1.0,
      // Strip PII from error events before sending
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
