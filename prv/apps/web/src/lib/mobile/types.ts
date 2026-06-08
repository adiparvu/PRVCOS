// Canonical types for the mobile API — must stay in sync with
// apps/mobile/src/hooks/useCommand.ts

export interface KPIItem {
  value: string
  label: string
  delta: string | null
  deltaType: "up" | "down" | "neutral"
  valueColor?: string
}

export interface AlertItem {
  id: string
  severity: "amber" | "red"
  title: string
  subtitle: string
  timeAgo: string
}

export interface InboxItem {
  id: string
  initials: string
  sender: string
  preview: string
  timeAgo: string
  unread: boolean
}

export interface QuickAction {
  id: string
  icon: string
  label: string
  route: string
}

export interface CommandData {
  user: {
    firstName: string
    role: string
    scopeName: string
  }
  kpis: KPIItem[]
  secondary: {
    label: string
    value: string
    valueColor?: string
  }[]
  aiBriefing: {
    summary: string
    insights: string[]
  } | null
  alerts: AlertItem[]
  quickActions: QuickAction[]
  inbox: InboxItem[]
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface DayRevenue {
  date: string
  total: number
}

export interface FinanceOrderItem {
  id: string
  orderNumber: string
  status: string
  amount: string
  createdAt: string
}

export interface FinanceInvoiceItem {
  id: string
  invoiceNumber: string
  clientName: string | null
  status: string
  amount: string
  currency: string
  dueDate: string | null
  paidAt: string | null
}

export interface FinanceData {
  revenueKpi: {
    thisMonth: string
    profitEstimate: string
    ordersCount: number
    avgOrderValue: string
    deltaPercent: number | null
  }
  dailyRevenue: DayRevenue[]
  recentOrders: FinanceOrderItem[]
  invoicesKpi: {
    outstanding: string
    overdueCount: number
    overdueAmount: string
    paidMtd: string
    draftCount: number
  }
  invoices: FinanceInvoiceItem[]
}

// ─── People ───────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  initials: string
  role: string
  jobTitle: string | null
  lastActiveAt: string | null
  isOnline: boolean
  isActiveToday: boolean
  storeId: string | null
}

export interface StoreGroup {
  storeId: string | null
  storeName: string
  memberCount: number
  onlineCount: number
  previews: { id: string; initials: string; isOnline: boolean }[]
}

export interface AttendanceRecord {
  id: string
  firstName: string
  lastName: string
  initials: string
  role: string
  jobTitle: string | null
  lastActiveAt: string | null
  isActiveToday: boolean
}

export interface PeopleData {
  teamKpi: {
    total: number
    online: number
    uniqueRoles: number
  }
  members: TeamMember[]
  scheduleKpi: {
    locations: number
    assigned: number
    unassigned: number
  }
  storeGroups: StoreGroup[]
  attendanceKpi: {
    activeToday: number
    inactiveToday: number
    total: number
  }
  attendance: AttendanceRecord[]
}

// ─── Intelligence ────────────────────────────────────────────────────────────

export interface IntelligenceAlertItem {
  id: string
  severity: "red" | "amber"
  title: string
  timeAgo: string
}

export interface IntelligenceWeek {
  weekLabel: string
  total: number
  isProjected: boolean
}

export interface IntelligenceForecastDriver {
  label: string
  amountFormatted: string
  positive: boolean
}

export interface IntelligenceData {
  aiBriefing: {
    summary: string
    insights: string[]
  } | null
  alerts: IntelligenceAlertItem[]
  analytics: {
    dailyRevenue30: DayRevenue[]
    monthlyRevenue: { label: string; total: number }[]
    collectionRate: number
    activeClients: number
    avgDealSizeFormatted: string
    projectsTotal: number
    deltaPercent: number | null
  }
  forecast: {
    monthEndFormatted: string
    confidence: number
    weeks: IntelligenceWeek[]
    drivers: IntelligenceForecastDriver[]
  }
}

// ─── Operations ────────────────────────────────────────────────────────────────

export interface ProjectItem {
  id: string
  name: string
  clientName: string | null
  status: string
  value: string | null
  dueDate: string | null
  progress: number
}

export interface OrderItem {
  id: string
  orderNumber: string
  status: string
  amount: string
  createdAt: string
}

export interface TaskItem {
  id: string
  title: string
  projectName: string
  dueDate: string | null
  isComplete: boolean
  isOverdue: boolean
  completedAt: string | null
}

export interface OperationsData {
  projectsKpi: {
    active: number
    onHold: number
    avgProgress: number
    pipeline: string
  }
  projects: ProjectItem[]
  ordersKpi: {
    thisWeek: number
    pending: number
    revenue: string
    refunded: number
  }
  orders: OrderItem[]
  tasksKpi: {
    open: number
    overdue: number
    doneToday: number
  }
  tasks: TaskItem[]
}
