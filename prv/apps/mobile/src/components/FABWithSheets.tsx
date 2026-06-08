import { StyleSheet, Text, TouchableOpacity } from "react-native"
import { useState } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ActionChooser, type CreateType } from "./ActionChooser"
import { CreateInvoiceSheet } from "./CreateInvoiceSheet"
import { CreateOrderSheet } from "./CreateOrderSheet"
import { CreateProjectSheet } from "./CreateProjectSheet"
import { CreateClientSheet } from "./CreateClientSheet"

type FlowState = null | "chooser" | CreateType

interface Props {
  /** Extra bottom offset in addition to safe area (default 86 puts FAB just above tab bar). */
  bottomOffset?: number
}

export function FABWithSheets({ bottomOffset = 86 }: Props) {
  const insets = useSafeAreaInsets()
  const [flow, setFlow] = useState<FlowState>(null)

  const openChooser = () => setFlow("chooser")
  const closeAll = () => setFlow(null)

  const handleSelect = (type: CreateType) => {
    setFlow(null)
    // Brief pause lets ActionChooser animation start before next sheet opens
    setTimeout(() => setFlow(type), 280)
  }

  return (
    <>
      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + bottomOffset }]}
        onPress={openChooser}
        activeOpacity={0.85}
      >
        <Text style={s.fabIcon}>+</Text>
      </TouchableOpacity>

      <ActionChooser visible={flow === "chooser"} onClose={closeAll} onSelect={handleSelect} />
      <CreateInvoiceSheet visible={flow === "invoice"} onClose={closeAll} />
      <CreateOrderSheet visible={flow === "order"} onClose={closeAll} />
      <CreateProjectSheet visible={flow === "project"} onClose={closeAll} />
      <CreateClientSheet visible={flow === "client"} onClose={closeAll} />
    </>
  )
}

const s = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 10,
  },
  fabIcon: {
    fontSize: 28,
    color: "#000",
    fontWeight: "300",
    lineHeight: 30,
    marginTop: -1,
  },
})
