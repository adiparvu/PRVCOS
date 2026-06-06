import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassCodeBlock } from "../components/glass-code-block"
import { GlassCopyButton, GlassKbd } from "../components/glass-copy-button"

const meta: Meta = {
  title: "Glass Display/CodeBlock",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

const EXAMPLE_TS = `import { withGates } from "@prv/auth/gates"
import { RoleSets } from "@prv/auth/permissions"

export const GET = withGates(
  {
    action: "employees.list",
    requiredRoles: RoleSets.management,
    requiredScope: "SCOPE_COMPANY",
  },
  async (req, ctx) => {
    const employees = await db
      .select()
      .from(employees_table)
      .where(eq(employees_table.companyId, ctx.session.companyId))
    return NextResponse.json({ employees })
  }
)`

export const TypeScript: Story = {
  name: "TypeScript",
  render: () => (
    <GlassCodeBlock
      code={EXAMPLE_TS}
      language="typescript"
      filename="api/employees/route.ts"
      showLineNumbers
      copyable
    />
  ),
}

export const NoChrome: Story = {
  name: "No Chrome",
  render: () => (
    <GlassCodeBlock
      code={`SELECT e.name, r.name as role\nFROM employees e\nJOIN roles r ON e.role_id = r.id\nWHERE e.company_id = $1\nORDER BY e.name;`}
      language="sql"
      chrome={false}
      showLineNumbers={false}
    />
  ),
}

export const CopyButton: Story = {
  name: "Copy Button & Kbd",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
      <GlassCopyButton value="npm install @prv/ui" />
      <GlassCopyButton
        value="https://prv.app/invite/abc123"
        label="Copy link"
        copiedLabel="Link copied!"
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Command palette:</span>
        <GlassKbd keys={["⌘", "K"]} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Save:</span>
        <GlassKbd keys={["⌘", "S"]} />
      </div>
    </div>
  ),
}
