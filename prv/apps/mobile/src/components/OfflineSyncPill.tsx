import { useEffect, useRef, useState } from "react"
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { flushQueue, subscribeQueue, type QueueSyncState } from "@/lib/offline-queue"
import { colors, radius } from "@/tokens"

// Floating Status component (preview approved 2026-07): visible only while
// the durable offline queue holds anything — "N waiting to sync" offline,
// "Syncing… k of N" while draining, gone the moment the queue is empty.
// Tap retries the flush immediately.

export function useQueueSyncState(): QueueSyncState {
  const [state, setState] = useState<QueueSyncState>({ pending: 0, syncing: false })
  useEffect(() => subscribeQueue(setState), [])
  return state
}

function Spinner() {
  const spin = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [spin])
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })
  return (
    <Animated.Text style={[s.glyph, { transform: [{ rotate }] }]} accessible={false}>
      ◌
    </Animated.Text>
  )
}

export function OfflineSyncPill() {
  const state = useQueueSyncState()
  if (state.pending === 0 && !state.syncing) return null

  const syncing = state.syncing && state.progress
  const label = syncing ? `Syncing…` : `${state.pending} waiting to sync`
  const detail = syncing
    ? `${state.progress!.done} of ${state.progress!.total}`
    : "sends when online"

  return (
    <View style={s.wrap} pointerEvents="box-none">
      <TouchableOpacity
        style={s.pill}
        activeOpacity={0.8}
        disabled={state.syncing}
        onPress={() => void flushQueue()}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${detail}. Tap to retry now.`}
        accessibilityLiveRegion="polite"
      >
        <View style={s.shine} pointerEvents="none" />
        {syncing ? <Spinner /> : <Text style={s.glyph}>⇅</Text>}
        <Text style={s.label}>{label}</Text>
        <Text style={s.detail}>· {detail}</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(30,30,32,0.96)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  glyph: { fontSize: 13, color: colors.text2 },
  label: { fontSize: 12.5, fontWeight: "600", color: colors.text1 },
  detail: { fontSize: 12.5, color: colors.text3 },
})
