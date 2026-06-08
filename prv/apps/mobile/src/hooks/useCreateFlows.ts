import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface LineItem {
  name: string
  qty: number
  unitPrice: number
  vatRate: number
}

export function calcTotals(items: LineItem[]) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const vatAmount = items.reduce((s, i) => s + i.qty * i.unitPrice * (i.vatRate / 100), 0)
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round((subtotal + vatAmount) * 100) / 100,
  }
}

export function fmtLineTotal(item: LineItem): string {
  const val = item.qty * item.unitPrice * (1 + item.vatRate / 100)
  return val.toFixed(2)
}

export interface CreateInvoiceInput {
  clientId?: string
  projectId?: string
  issueDate: string
  dueDate: string
  currency: string
  notes?: string
  reference?: string
  items: LineItem[]
}

export interface CreateOrderInput {
  clientId?: string
  storeId?: string
  currency: string
  notes?: string
  items: LineItem[]
}

export interface CreateProjectInput {
  name: string
  clientId?: string
  storeId?: string
  dueDate?: string
  status: "draft" | "active"
  memberIds?: string[]
}

export interface CreateClientInput {
  name: string
  type: "business" | "individual"
  email?: string
  phone?: string
  city?: string
  vatNumber?: string
  notes?: string
}

export type ExpenseCategory =
  | "materials"
  | "labor"
  | "equipment"
  | "transport"
  | "rent"
  | "utilities"
  | "marketing"
  | "salaries"
  | "subscriptions"
  | "other"

export interface CreateExpenseInput {
  title: string
  category: ExpenseCategory
  amount: number
  currency: string
  date: string
  status: "draft" | "submitted"
  notes?: string
  storeId?: string
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) =>
      api.post<{
        id: string
        invoiceNumber: string
        status: string
        total: number
        currency: string
      }>("/api/mobile/invoices", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] })
    },
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrderInput) =>
      api.post<{
        id: string
        orderNumber: string
        status: string
        total: number
        currency: string
      }>("/api/mobile/orders", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] })
      qc.invalidateQueries({ queryKey: ["operations"] })
    },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      api.post<{ id: string; name: string; status: string; code: string }>(
        "/api/mobile/projects",
        input
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations"] })
    },
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClientInput) =>
      api.post<{ id: string; name: string; type: string; status: string }>(
        "/api/mobile/clients",
        input
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["search"] })
    },
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      api.post<{ id: string; title: string; status: string }>("/api/mobile/expenses", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] })
    },
  })
}

export interface CreateEmployeeInput {
  firstName: string
  lastName: string
  email: string
  jobTitle?: string
  phone?: string
  role: string
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) =>
      api.post<{ success: boolean; message: string }>("/api/mobile/employees", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people"] })
    },
  })
}
