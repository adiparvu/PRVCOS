import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

// ── Invoice Detail ─────────────────────────────────────────────────────────────

export interface InvoiceDetail {
  invoice: {
    id: string
    invoiceNumber: string
    status: string
    subtotal: string
    vatAmount: string
    total: string
    subtotalRaw: number
    vatAmountRaw: number
    totalRaw: number
    currency: string
    issueDate: string
    dueDate: string | null
    paidAt: string | null
    notes: string | null
    orderId: string | null
  }
  client: { id: string; name: string } | null
  project: { id: string; name: string } | null
  createdBy: { name: string } | null
  items: {
    id: string
    description: string
    quantity: number
    unit: string
    unitPrice: number
    unitPriceFormatted: string
    vatRate: number
    total: number
    totalFormatted: string
  }[]
}

export function useInvoiceDetail(invoiceId: string) {
  return useQuery<InvoiceDetail>({
    queryKey: ["invoice-detail", invoiceId],
    queryFn: () => api.get<InvoiceDetail>(`/api/mobile/invoices/${invoiceId}`),
    staleTime: 30_000,
    retry: 2,
    enabled: !!invoiceId,
  })
}

// ── Order Detail ───────────────────────────────────────────────────────────────

export interface OrderDetail {
  order: {
    id: string
    orderNumber: string
    status: string
    statusStep: number
    subtotal: string
    vatAmount: string
    total: string
    subtotalRaw: number
    vatAmountRaw: number
    totalRaw: number
    currency: string
    notes: string | null
    createdAt: string
    updatedAt: string
  }
  client: { id: string; name: string } | null
  store: string | null
  assignedTo: { id: string; name: string } | null
  items: {
    id: string
    name: string
    sku: string | null
    quantity: number
    unitPrice: number
    unitPriceFormatted: string
    vatRate: number
    total: number
    totalFormatted: string
  }[]
}

export function useOrderDetail(orderId: string) {
  return useQuery<OrderDetail>({
    queryKey: ["order-detail", orderId],
    queryFn: () => api.get<OrderDetail>(`/api/mobile/orders/${orderId}`),
    staleTime: 30_000,
    retry: 2,
    enabled: !!orderId,
  })
}

export function useUpdateInvoiceStatus(invoiceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: "sent" | "paid" | "cancelled") =>
      api.patch<{ id: string; status: string }>(`/api/mobile/invoices/${invoiceId}`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] })
      void qc.invalidateQueries({ queryKey: ["finance"] })
    },
  })
}
