import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassTable } from "../components/glass-table"

const meta: Meta = {
  title: "Glass Display/GlassTable",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

type Employee = {
  id: string
  name: string
  role: string
  department: string
  status: string
  joined: string
}

const EMPLOYEES: Employee[] = [
  {
    id: "1",
    name: "Ion Popescu",
    role: "CEO",
    department: "Leadership",
    status: "Active",
    joined: "Jan 2021",
  },
  {
    id: "2",
    name: "Ana Moldovan",
    role: "HR & Payroll",
    department: "Human Resources",
    status: "Active",
    joined: "Mar 2021",
  },
  {
    id: "3",
    name: "Gheorghe Vasile",
    role: "Operations Manager",
    department: "Operations",
    status: "Active",
    joined: "Jun 2021",
  },
  {
    id: "4",
    name: "Livia Marin",
    role: "Team Leader",
    department: "Field Ops",
    status: "On Leave",
    joined: "Sep 2021",
  },
  {
    id: "5",
    name: "Bogdan Costea",
    role: "Worker",
    department: "Field Ops",
    status: "Active",
    joined: "Jan 2022",
  },
  {
    id: "6",
    name: "Elena Dragomir",
    role: "Data Analyst",
    department: "Intelligence",
    status: "Active",
    joined: "Apr 2022",
  },
  {
    id: "7",
    name: "Mihai Iancu",
    role: "Project Director",
    department: "Projects",
    status: "Suspended",
    joined: "Jul 2022",
  },
]

const STATUS_COLOR: Record<string, string> = {
  Active: "rgba(48,209,88,0.85)",
  "On Leave": "rgba(255,149,0,0.85)",
  Suspended: "rgba(255,59,48,0.85)",
}

export const Default: Story = {
  name: "Employee Directory",
  render: () => (
    <GlassTable<Employee>
      keyField="id"
      columns={[
        { key: "name", label: "Name", sortable: true },
        { key: "role", label: "Role", sortable: true },
        { key: "department", label: "Department" },
        {
          key: "status",
          label: "Status",
          sortable: true,
          render: (row) => (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 100,
                background: `${STATUS_COLOR[row.status] ?? "rgba(255,255,255,0.1)"}22`,
                color: STATUS_COLOR[row.status] ?? "var(--prv-text-2)",
                border: `1px solid ${STATUS_COLOR[row.status] ?? "rgba(255,255,255,0.1)"}44`,
              }}
            >
              {row.status}
            </span>
          ),
        },
        { key: "joined", label: "Joined" },
      ]}
      data={EMPLOYEES}
    />
  ),
}

export const Selectable: Story = {
  name: "Selectable Rows",
  render: () => (
    <GlassTable<Employee>
      keyField="id"
      selectable
      columns={[
        { key: "name", label: "Name", sortable: true },
        { key: "role", label: "Role" },
        { key: "status", label: "Status" },
      ]}
      data={EMPLOYEES}
      onSelectionChange={(rows) =>
        console.log(
          "selected:",
          rows.map((r) => r.name)
        )
      }
    />
  ),
}

export const Paginated: Story = {
  name: "Paginated (3 per page)",
  render: () => {
    const [page, setPage] = React.useState(0)
    const pageSize = 3
    const slice = EMPLOYEES.slice(page * pageSize, (page + 1) * pageSize)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <GlassTable<Employee>
          keyField="id"
          columns={[
            { key: "name", label: "Name" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status" },
          ]}
          data={slice}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.08)",
              color: "var(--prv-text-2)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ‹ Prev
          </button>
          <button
            onClick={() => setPage((p) => ((p + 1) * pageSize < EMPLOYEES.length ? p + 1 : p))}
            disabled={(page + 1) * pageSize >= EMPLOYEES.length}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.08)",
              color: "var(--prv-text-2)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Next ›
          </button>
        </div>
      </div>
    )
  },
}

export const Empty: Story = {
  name: "Empty State",
  render: () => (
    <GlassTable<Employee>
      keyField="id"
      columns={[
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
        { key: "status", label: "Status" },
      ]}
      data={[]}
    />
  ),
}
