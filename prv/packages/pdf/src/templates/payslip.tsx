import React from "react"
import { Document, Page, View, Text } from "@react-pdf/renderer"
import { base, colors, spacing } from "../styles"
import { formatCurrency, formatDate } from "../format"

export interface PayslipDeduction {
  label: string
  rate?: number
  amount: number
}

export interface PayslipBonus {
  label: string
  amount: number
}

export interface PayslipProps {
  // Employee
  employeeName: string
  employeeId?: string
  position?: string
  department?: string
  cnp?: string

  // Company
  companyName: string
  companyCUI: string

  // Period
  periodStart: string
  periodEnd: string
  paymentDate: string

  // Salary components
  baseSalary: number
  bonuses?: PayslipBonus[]
  grossSalary: number
  deductions: PayslipDeduction[]
  netSalary: number

  currency?: string
  locale?: string
  notes?: string
}

function SalaryRow({
  label,
  amount,
  currency,
  bold = false,
  indent = false,
}: {
  label: string
  amount: number
  currency: string
  bold?: boolean
  indent?: boolean
}) {
  return (
    <View style={[base.summaryRow, { paddingLeft: indent ? 16 : 0 }]}>
      <Text
        style={
          bold
            ? [base.summaryLabel, { fontFamily: "Helvetica-Bold", color: colors.black }]
            : base.summaryLabel
        }
      >
        {label}
      </Text>
      <Text style={bold ? [base.summaryValue, { fontSize: 11 }] : base.summaryValue}>
        {formatCurrency(amount, currency)}
      </Text>
    </View>
  )
}

export function PayslipPdf(props: PayslipProps) {
  const {
    employeeName,
    employeeId,
    position,
    department,
    cnp,
    companyName,
    companyCUI,
    periodStart,
    periodEnd,
    paymentDate,
    baseSalary,
    bonuses = [],
    grossSalary,
    deductions,
    netSalary,
    currency = "RON",
  } = props

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)

  return (
    <Document
      title={`Fluturași salariu — ${employeeName}`}
      author={companyName}
      creator="PRV Platform"
    >
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View style={[base.row, { marginBottom: spacing.xxl, alignItems: "flex-end" }]}>
          <View style={base.col}>
            <Text style={base.h1}>{companyName}</Text>
            <Text style={base.small}>CUI: {companyCUI}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: colors.black }}>
              FLUTURAȘ SALARIU
            </Text>
            <Text style={base.muted}>
              {new Date(periodStart)
                .toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
                .toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={base.dividerHeavy} />

        {/* Employee info */}
        <View style={[base.row, { marginBottom: spacing.xl }]}>
          <View style={base.col}>
            <Text style={base.label}>Angajat</Text>
            <Text style={[base.h2, { marginBottom: 2 }]}>{employeeName}</Text>
            {position && <Text style={base.body}>{position}</Text>}
            {department && <Text style={base.small}>{department}</Text>}
            {cnp && <Text style={base.small}>CNP: {cnp}</Text>}
            {employeeId && <Text style={base.small}>ID: {employeeId}</Text>}
          </View>
          <View style={{ width: 200 }}>
            <View style={{ marginBottom: spacing.sm }}>
              <Text style={base.label}>Perioadă</Text>
              <Text style={base.value}>
                {formatDate(periodStart)} — {formatDate(periodEnd)}
              </Text>
            </View>
            <View>
              <Text style={base.label}>Data plății</Text>
              <Text style={[base.value, { fontFamily: "Helvetica-Bold" }]}>
                {formatDate(paymentDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Salary breakdown */}
        <View style={[base.row, { gap: spacing.xl }]}>
          {/* Earnings */}
          <View style={base.col}>
            <Text
              style={[
                base.h3,
                {
                  marginBottom: spacing.md,
                  paddingBottom: spacing.xs,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.gray20,
                },
              ]}
            >
              Venituri brute
            </Text>
            <SalaryRow label="Salariu de bază" amount={baseSalary} currency={currency} />
            {bonuses.map((b, i) => (
              <SalaryRow key={i} label={b.label} amount={b.amount} currency={currency} indent />
            ))}
            <View style={[base.divider, { marginTop: spacing.xs }]} />
            <SalaryRow label="TOTAL BRUT" amount={grossSalary} currency={currency} bold />
          </View>

          {/* Deductions */}
          <View style={base.col}>
            <Text
              style={[
                base.h3,
                {
                  marginBottom: spacing.md,
                  paddingBottom: spacing.xs,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.gray20,
                },
              ]}
            >
              Rețineri
            </Text>
            {deductions.map((d, i) => (
              <View key={i} style={base.summaryRow}>
                <Text style={base.summaryLabel}>
                  {d.label}
                  {d.rate !== undefined ? ` (${(d.rate * 100).toFixed(0)}%)` : ""}
                </Text>
                <Text style={[base.summaryValue, { color: colors.gray60 }]}>
                  - {formatCurrency(d.amount, currency)}
                </Text>
              </View>
            ))}
            <View style={[base.divider, { marginTop: spacing.xs }]} />
            <View style={base.summaryRow}>
              <Text
                style={[base.summaryLabel, { fontFamily: "Helvetica-Bold", color: colors.black }]}
              >
                Total rețineri
              </Text>
              <Text style={[base.summaryValue, { color: colors.black }]}>
                - {formatCurrency(totalDeductions, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Net salary box */}
        <View
          style={{
            marginTop: spacing.xxl,
            padding: spacing.xl,
            backgroundColor: colors.black,
            borderRadius: 4,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: colors.white }}>
            SALARIU NET DE PLATĂ
          </Text>
          <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: colors.white }}>
            {formatCurrency(netSalary, currency)}
          </Text>
        </View>

        {/* Signature area */}
        <View style={[base.row, { marginTop: spacing.xxxl, gap: spacing.xxxl }]}>
          <View style={base.col}>
            <View
              style={{ borderTopWidth: 1, borderTopColor: colors.gray40, paddingTop: spacing.xs }}
            >
              <Text style={base.muted}>Semnătura angajatorului</Text>
            </View>
          </View>
          <View style={base.col}>
            <View
              style={{ borderTopWidth: 1, borderTopColor: colors.gray40, paddingTop: spacing.xs }}
            >
              <Text style={base.muted}>Semnătura angajatului / Data primirii</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>
            {companyName} · CUI {companyCUI}
          </Text>
          <Text style={base.footerText}>Document generat de PRV Platform</Text>
          <Text
            style={base.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
