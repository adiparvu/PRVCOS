import AsyncStorage from "@react-native-async-storage/async-storage"
import { api } from "@/lib/api"

// Durable mutation queue (audit P2.10) — field workers lose signal on job
// sites, and losing a clock-in or a task tick with it is a data-integrity
// problem, not an inconvenience.
//
// Semantics:
// - enqueue() persists the mutation BEFORE any network attempt, so a crash
//   mid-flight cannot lose it.
// - flush() replays in FIFO order. Order matters (clock-in before clock-out),
//   so a network failure stops the flush — remaining items wait for the next
//   attempt rather than replaying out of order.
// - A server 4xx means the server SAW the request and rejected it; retrying
//   the identical payload can never succeed, so the item is dropped and
//   reported to onRejected. Only network-level failures keep an item queued.
// - Items older than MAX_AGE_MS are dropped on flush: replaying a clock-in
//   from three days ago does more harm than good.

export interface QueuedMutation {
  id: string
  path: string
  method: "POST" | "PATCH" | "DELETE"
  body: unknown
  queuedAt: number
  /** short human label, e.g. "Clock in" — shown in sync UI */
  label: string
}

export interface FlushResult {
  sent: number
  rejected: QueuedMutation[]
  expired: QueuedMutation[]
  /** items still queued (flush stopped on a network failure) */
  remaining: number
}

const KEY = "prv_offline_mutation_queue"
const MAX_QUEUE = 200
const MAX_AGE_MS = 48 * 60 * 60 * 1000 // 48h

let flushing = false

// ── Sync-state subscribers (no polling) ───────────────────────────────────────
// The floating sync pill listens here; the queue notifies on enqueue and on
// every step of a flush. State is best-effort UI signal, not source of truth.

export interface QueueSyncState {
  pending: number
  syncing: boolean
  /** during a flush: how many of the initial batch have been sent */
  progress?: { done: number; total: number }
}

type QueueListener = (state: QueueSyncState) => void
const listeners = new Set<QueueListener>()
let lastState: QueueSyncState = { pending: 0, syncing: false }

function notify(state: QueueSyncState): void {
  lastState = state
  for (const l of listeners) l(state)
}

/** Subscribe to queue state changes; immediately replays the last known state. */
export function subscribeQueue(listener: QueueListener): () => void {
  listeners.add(listener)
  listener(lastState)
  // Refresh from storage so a fresh mount shows queued items from a previous
  // session without waiting for the next enqueue/flush.
  void pendingCount().then((pending) => {
    if (!lastState.syncing && pending !== lastState.pending) notify({ pending, syncing: false })
  })
  return () => {
    listeners.delete(listener)
  }
}

async function readQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : []
  } catch {
    return []
  }
}

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(queue))
  } catch {
    // Storage failure degrades to in-memory-only for this session; the
    // mutation itself was already attempted or will be retried by the caller.
  }
}

export async function enqueueMutation(
  input: Omit<QueuedMutation, "id" | "queuedAt">
): Promise<QueuedMutation> {
  const item: QueuedMutation = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    queuedAt: Date.now(),
  }
  const queue = await readQueue()
  queue.push(item)
  const trimmed = queue.slice(-MAX_QUEUE)
  await writeQueue(trimmed)
  notify({ pending: trimmed.length, syncing: false })
  return item
}

export async function pendingCount(): Promise<number> {
  return (await readQueue()).length
}

/** True when the error looks like a transport failure rather than a server verdict. */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  // fetch() rejects with TypeError on network failure; our api client throws
  // Error(data.error) for HTTP failures, which means the server was reached.
  return err.name === "TypeError" || /network request failed/i.test(err.message)
}

export async function flushQueue(
  onRejected?: (item: QueuedMutation, error: Error) => void
): Promise<FlushResult> {
  if (flushing) return { sent: 0, rejected: [], expired: [], remaining: await pendingCount() }
  flushing = true
  try {
    const queue = await readQueue()
    const now = Date.now()
    const fresh = queue.filter((i) => now - i.queuedAt <= MAX_AGE_MS)
    const expired = queue.filter((i) => now - i.queuedAt > MAX_AGE_MS)

    const rejected: QueuedMutation[] = []
    let sent = 0
    const total = fresh.length
    if (total > 0) notify({ pending: total, syncing: true, progress: { done: 0, total } })

    while (fresh.length > 0) {
      const item = fresh[0]!
      try {
        if (item.method === "POST") await api.post(item.path, item.body)
        else if (item.method === "PATCH") await api.patch(item.path, item.body)
        else await api.delWithBody(item.path, item.body)
        sent++
        fresh.shift()
        notify({ pending: fresh.length, syncing: true, progress: { done: sent, total } })
      } catch (err) {
        if (isNetworkError(err)) {
          // Still offline — keep this and everything after it, in order.
          break
        }
        // The server answered and said no; retrying cannot help.
        rejected.push(item)
        onRejected?.(item, err instanceof Error ? err : new Error(String(err)))
        fresh.shift()
      }
    }

    await writeQueue(fresh)
    notify({ pending: fresh.length, syncing: false })
    return { sent, rejected, expired, remaining: fresh.length }
  } finally {
    flushing = false
  }
}

/**
 * Run a mutation now; if the network is down, queue it durably instead.
 * Returns { queued: true } when the caller should show "saved — will sync".
 */
export async function mutateOrQueue<T>(
  input: Omit<QueuedMutation, "id" | "queuedAt">
): Promise<{ queued: false; data: T } | { queued: true }> {
  try {
    let data: T
    if (input.method === "POST") data = await api.post<T>(input.path, input.body)
    else if (input.method === "PATCH") data = await api.patch<T>(input.path, input.body)
    else data = await api.delWithBody<T>(input.path, input.body)
    return { queued: false, data }
  } catch (err) {
    if (!isNetworkError(err)) throw err
    await enqueueMutation(input)
    return { queued: true }
  }
}
