import { describe, it, expect } from "vitest"

// ── AttendanceWorkspace mapper logic ─────────────────────────────────────────

type AttendanceStatus = "Present" | "Late" | "Absent" | "On Leave" | "Clocked Out"
type ApiStatus = "present" | "late" | "absent" | "leave" | "clocked_out"

function mapApiStatus(s: ApiStatus): AttendanceStatus {
  const m: Record<ApiStatus, AttendanceStatus> = {
    present: "Present",
    late: "Late",
    absent: "Absent",
    leave: "On Leave",
    clocked_out: "Clocked Out",
  }
  return m[s]
}

describe("mapApiStatus (AttendanceWorkspace)", () => {
  it("maps each API status to display label", () => {
    expect(mapApiStatus("present")).toBe("Present")
    expect(mapApiStatus("late")).toBe("Late")
    expect(mapApiStatus("absent")).toBe("Absent")
    expect(mapApiStatus("leave")).toBe("On Leave")
    expect(mapApiStatus("clocked_out")).toBe("Clocked Out")
  })
})

// ── OperationsWorkspace: buildKanban grouping ─────────────────────────────────

type TaskStatus = "todo" | "in_progress" | "done"

interface MockTask {
  id: string
  title: string
  status: TaskStatus
  priority: string
  assigneeInitials: string
}

function buildKanban(tasks: MockTask[]) {
  const byStatus = (status: TaskStatus) =>
    tasks
      .filter((t) => t.status === status)
      .map((t) => ({
        id: t.id,
        title: t.title,
        data: { priority: t.priority, assignee: t.assigneeInitials },
      }))

  return [
    { id: "todo", cards: byStatus("todo") },
    { id: "inprogress", cards: byStatus("in_progress") },
    { id: "done", cards: byStatus("done") },
  ]
}

describe("buildKanban (OperationsWorkspace)", () => {
  const tasks: MockTask[] = [
    { id: "t1", title: "Fix roof", status: "todo", priority: "urgent", assigneeInitials: "AP" },
    { id: "t2", title: "Paint walls", status: "in_progress", priority: "medium", assigneeInitials: "MB" },
    { id: "t3", title: "Install tiles", status: "done", priority: "low", assigneeInitials: "CR" },
    { id: "t4", title: "Plumbing check", status: "todo", priority: "medium", assigneeInitials: "AP" },
  ]

  it("groups tasks by status into correct columns", () => {
    const cols = buildKanban(tasks)
    expect(cols.find((c) => c.id === "todo")?.cards).toHaveLength(2)
    expect(cols.find((c) => c.id === "inprogress")?.cards).toHaveLength(1)
    expect(cols.find((c) => c.id === "done")?.cards).toHaveLength(1)
  })

  it("preserves card title and data fields", () => {
    const cols = buildKanban(tasks)
    const todoCards = cols.find((c) => c.id === "todo")?.cards ?? []
    expect(todoCards[0]).toMatchObject({ id: "t1", title: "Fix roof", data: { priority: "urgent" } })
  })

  it("returns empty columns for empty task list", () => {
    const cols = buildKanban([])
    cols.forEach((col) => expect(col.cards).toHaveLength(0))
  })
})

// ── ProjectsWorkspace: fmtEuro used for budget aggregation ────────────────────

function fmtEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${Math.round(n / 1000)}k`
  return `€${n.toLocaleString()}`
}

describe("Budget aggregation (ProjectsWorkspace)", () => {
  it("sums project budgets and formats total", () => {
    const budgets = [180_000, 450_000, 320_000, 1_200_000]
    const total = budgets.reduce((s, b) => s + b, 0)
    expect(total).toBe(2_150_000)
    // 2.15M → toFixed(1) → "2.1"
    expect(fmtEuro(total)).toBe("€2.1M")
  })
})

// ── deriveTransactions sort + limit logic ─────────────────────────────────────

interface MinimalInvoice {
  id: string
  ref: string
  clientName: string
  projectName: string | null
  amount: number
  issuedDate: string
}

interface MinimalExpense {
  id: string
  title: string
  category: string
  amount: number
  date: string
}

function deriveTransactions(invoices: MinimalInvoice[], expenses: MinimalExpense[]) {
  type TxRow = {
    id: string
    description: string
    category: string
    store: string
    kind: "credit" | "debit"
    _sortDate: string
  }

  const invTx: TxRow[] = invoices.map((inv) => ({
    id: `inv-${inv.id}`,
    description: `${inv.ref} — ${inv.clientName}`,
    category: "Invoice",
    store: inv.projectName ?? "—",
    kind: "credit",
    _sortDate: inv.issuedDate,
  }))

  const expTx: TxRow[] = expenses.map((exp) => ({
    id: `exp-${exp.id}`,
    description: exp.title,
    category: exp.category,
    store: "—",
    kind: "debit",
    _sortDate: exp.date,
  }))

  return [...invTx, ...expTx]
    .sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime())
    .slice(0, 8)
    .map(({ _sortDate: _, ...row }) => row)
}

describe("deriveTransactions (FinanceWorkspace)", () => {
  const invoices: MinimalInvoice[] = [
    { id: "i1", ref: "INV-001", clientName: "Popescu", projectName: "Cluj Apt", amount: 5000, issuedDate: "2025-06-01" },
    { id: "i2", ref: "INV-002", clientName: "Ionescu", projectName: null, amount: 3000, issuedDate: "2025-05-15" },
  ]
  const expenses: MinimalExpense[] = [
    { id: "e1", title: "Materials", category: "Supplies", amount: 1200, date: "2025-06-07" },
    { id: "e2", title: "Transport", category: "Logistics", amount: 400, date: "2025-05-20" },
  ]

  it("merges invoices and expenses into a single list", () => {
    const txs = deriveTransactions(invoices, expenses)
    expect(txs).toHaveLength(4)
  })

  it("sorts by date descending (most recent first)", () => {
    const txs = deriveTransactions(invoices, expenses)
    expect(txs[0]?.id).toBe("exp-e1") // Jun 7 is most recent
    expect(txs[1]?.id).toBe("inv-i1") // Jun 1
    expect(txs[2]?.id).toBe("exp-e2") // May 20
    expect(txs[3]?.id).toBe("inv-i2") // May 15
  })

  it("labels invoices as credit and expenses as debit", () => {
    const txs = deriveTransactions(invoices, expenses)
    const credits = txs.filter((t) => t.kind === "credit")
    const debits = txs.filter((t) => t.kind === "debit")
    expect(credits).toHaveLength(2)
    expect(debits).toHaveLength(2)
  })

  it("limits output to 8 rows when more are available", () => {
    const manyInvoices: MinimalInvoice[] = Array.from({ length: 10 }, (_, i) => ({
      id: `i${i}`,
      ref: `INV-${i}`,
      clientName: "Client",
      projectName: null,
      amount: 1000,
      issuedDate: `2025-0${(i % 6) + 1}-01`,
    }))
    const txs = deriveTransactions(manyInvoices, [])
    expect(txs).toHaveLength(8)
  })

  it("strips _sortDate from output rows", () => {
    const txs = deriveTransactions(invoices, expenses)
    txs.forEach((tx) => {
      expect("_sortDate" in tx).toBe(false)
    })
  })
})
