"use client"

import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useToast } from "@prv/ui"

// Module-level handle to the toast API, set by <ToastBridge> once mounted.
// The mutation cache reads it lazily at error time, so no ref is touched
// during render (which the React Compiler forbids).
type ToastError = (title: string, description?: string) => void
let toastError: ToastError | null = null

function ToastBridge() {
  const { toast } = useToast()
  useEffect(() => {
    toastError = toast.error
    return () => {
      toastError = null
    }
  }, [toast])
  return null
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        // Surface any failed mutation as a glass error toast so actions no
        // longer fail silently. Individual mutations keep their own onSuccess.
        mutationCache: new MutationCache({
          onError: (error) => {
            const message =
              error instanceof Error && error.message ? error.message : "Please try again."
            toastError?.("Action failed", message)
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )
  return (
    <QueryClientProvider client={client}>
      <ToastBridge />
      {children}
    </QueryClientProvider>
  )
}
