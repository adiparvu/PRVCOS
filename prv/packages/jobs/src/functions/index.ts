export { pingFunction } from "./ping"

// All Inngest functions registered here — imported by the API route handler
export const allFunctions = [
  // Infrastructure
  (await import("./ping")).pingFunction,
]
