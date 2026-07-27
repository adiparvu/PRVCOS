import { useEffect, useState } from "react"
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useUploadClientDocument } from "@/hooks/useClientPortal"
import { colors, radius, spacing, type as t } from "@/tokens"

// Client document upload (preview approved 2026-07): pick a PDF/Word/Excel
// file (max 25MB), choose its type, upload. Lands as "Under review" for staff.

const ACCEPTED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]
const MAX_BYTES = 25 * 1024 * 1024

const DOC_TYPES = [
  { value: "contract", label: "Contract" },
  { value: "specification", label: "Specification" },
  { value: "other", label: "Other" },
] as const

type DocType = (typeof DOC_TYPES)[number]["value"]

interface Picked {
  uri: string
  name: string
  mimeType: string
  size: number
}

export function UploadClientDocumentSheet({
  visible,
  onClose,
  onUploaded,
}: {
  visible: boolean
  onClose: () => void
  onUploaded?: (title: string) => void
}) {
  const insets = useSafeAreaInsets()
  const [picked, setPicked] = useState<Picked | null>(null)
  const [docType, setDocType] = useState<DocType>("contract")
  const [error, setError] = useState<string | null>(null)
  const upload = useUploadClientDocument()

  useEffect(() => {
    if (visible) {
      setPicked(null)
      setDocType("contract")
      setError(null)
    }
  }, [visible])

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ACCEPTED, multiple: false })
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    if ((a.size ?? 0) > MAX_BYTES) {
      setError("File exceeds the 25MB limit")
      return
    }
    setError(null)
    setPicked({
      uri: a.uri,
      name: a.name,
      mimeType: a.mimeType ?? "application/pdf",
      size: a.size ?? 0,
    })
  }

  const submit = () => {
    if (!picked) return
    setError(null)
    upload.mutate(
      { uri: picked.uri, name: picked.name, mimeType: picked.mimeType, docType },
      {
        onSuccess: (r) => {
          onClose()
          onUploaded?.(r.title)
        },
        onError: (e) =>
          setError(e instanceof Error ? e.message : "Upload failed — please try again."),
      }
    )
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.shine} pointerEvents="none" />
          <View style={s.handleRow}>
            <View style={s.handle} />
          </View>
          <View style={s.header}>
            <View>
              <Text style={s.title}>Upload Document</Text>
              <Text style={s.sub}>PDF, Word or Excel · max 25 MB</Text>
            </View>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Close"
            >
              <Text style={s.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={s.body}>
            <TouchableOpacity
              style={s.fileCard}
              activeOpacity={0.75}
              onPress={() => void pick()}
              accessibilityRole="button"
              accessibilityLabel={picked ? "Change file" : "Choose file"}
            >
              <Text style={s.fileIcon}>{picked ? "≡" : "⊕"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.fileName} numberOfLines={1}>
                  {picked ? picked.name : "Choose a file…"}
                </Text>
                <Text style={s.fileMeta}>
                  {picked
                    ? `${(picked.size / 1024 / 1024).toFixed(1)} MB · tap to change`
                    : "From this phone"}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={s.sectionLabel}>Type</Text>
            <View style={s.pillRow}>
              {DOC_TYPES.map((d) => {
                const active = docType === d.value
                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[s.pill, active && s.pillActive]}
                    onPress={() => setDocType(d.value)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {error && <Text style={s.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[s.cta, (!picked || upload.isPending) && s.ctaDisabled]}
              onPress={submit}
              disabled={!picked || upload.isPending}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={s.ctaText}>{upload.isPending ? "Uploading…" : "Upload"}</Text>
            </TouchableOpacity>
            <Text style={s.fineprint}>
              Your document reaches the project team with status “Under review”.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: "rgba(28,28,30,0.97)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  handleRow: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { ...t.headline, color: colors.text1 },
  sub: { ...t.caption1, color: colors.text3, marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { fontSize: 13, color: colors.text3 },
  body: { paddingHorizontal: spacing.lg },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    padding: 14,
  },
  fileIcon: { fontSize: 17, color: colors.text2, width: 22, textAlign: "center" },
  fileName: { ...t.footnote, fontWeight: "600", color: colors.text1 },
  fileMeta: { ...t.caption2, color: colors.text3, marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 7,
    marginLeft: 2,
  },
  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  pillText: { fontSize: 13, fontWeight: "600", color: colors.text3 },
  pillTextActive: { color: colors.text1 },
  errorText: { fontSize: 12, color: colors.red, textAlign: "center", marginTop: 10 },
  cta: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText: { fontSize: 14.5, fontWeight: "700", color: "#000" },
  fineprint: { ...t.caption2, color: colors.text3, textAlign: "center", marginTop: 8 },
})
