import React from "react"
import { Document, Page, View, Text } from "@react-pdf/renderer"
import { base, colors, spacing } from "../styles"
import { formatCurrency, formatDate, formatNumber } from "../format"

export interface DevizItem {
  code?: string
  description: string
  unit: string
  quantity: number
  unitPriceMaterial?: number
  unitPriceLabor?: number
  unitPriceTotal: number
  totalMaterial?: number
  totalLabor?: number
  total: number
}

export interface DevizChapter {
  code: string
  title: string
  items: DevizItem[]
  subtotalMaterial?: number
  subtotalLabor?: number
  subtotal: number
}

export interface DevizProps {
  devizNumber: string
  issueDate: string
  validUntil?: string
  currency?: string

  companyName: string
  companyCUI: string
  companyAddress?: string
  companyEmail?: string

  clientName: string
  clientCUI?: string
  clientAddress?: string

  projectTitle: string
  projectAddress?: string
  projectCode?: string

  chapters: DevizChapter[]

  subtotalMaterial?: number
  subtotalLabor?: number
  subtotal: number
  vatRate?: number
  vatAmount: number
  total: number

  notes?: string
  status?: "draft" | "sent" | "accepted" | "rejected"
}

export function DevizPdf(props: DevizProps) {
  const {
    devizNumber,
    issueDate,
    validUntil,
    currency = "RON",
    companyName,
    companyCUI,
    companyAddress,
    companyEmail,
    clientName,
    clientCUI,
    clientAddress,
    projectTitle,
    projectAddress,
    projectCode,
    chapters,
    subtotalMaterial,
    subtotalLabor,
    subtotal,
    vatRate = 0.19,
    vatAmount,
    total,
    notes,
    status,
  } = props

  const statusColors: Record<string, string> = {
    draft: colors.gray40,
    sent: colors.black,
    accepted: colors.black,
    rejected: colors.gray60,
  }

  const statusLabels: Record<string, string> = {
    draft: "CIORNĂ",
    sent: "TRIMIS",
    accepted: "ACCEPTAT",
    rejected: "RESPINS",
  }

  return (
    <Document
      title={`Deviz ${devizNumber} — ${projectTitle}`}
      author={companyName}
      creator="PRV Platform"
    >
      {/* Cover page */}
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View style={[base.row, { marginBottom: spacing.xxl }]}>
          <View style={base.col}>
            <Text style={base.h1}>{companyName}</Text>
            {companyAddress && <Text style={base.small}>{companyAddress}</Text>}
            <Text style={base.small}>CUI: {companyCUI}</Text>
            {companyEmail && <Text style={base.small}>{companyEmail}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 24, fontFamily: "Helvetica-Bold", color: colors.black }}>
              DEVIZ OFERTĂ
            </Text>
            <Text style={[base.h2, { marginTop: spacing.xs }]}>Nr. {devizNumber}</Text>
            {status && (
              <View
                style={{
                  marginTop: spacing.xs,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 4,
                  backgroundColor: statusColors[status] ?? colors.black,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: colors.white }}>
                  {statusLabels[status] ?? status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={base.dividerHeavy} />

        {/* Meta info */}
        <View style={[base.row, { marginBottom: spacing.xl, marginTop: spacing.lg }]}>
          <View style={base.col}>
            <Text style={base.label}>Client</Text>
            <Text style={[base.h3, { marginBottom: 2 }]}>{clientName}</Text>
            {clientCUI && <Text style={base.small}>CUI: {clientCUI}</Text>}
            {clientAddress && <Text style={base.small}>{clientAddress}</Text>}
          </View>
          <View style={{ width: 200 }}>
            <View style={{ marginBottom: spacing.sm }}>
              <Text style={base.label}>Data emiterii</Text>
              <Text style={base.value}>{formatDate(issueDate)}</Text>
            </View>
            {validUntil && (
              <View>
                <Text style={base.label}>Valabil până la</Text>
                <Text style={[base.value, { fontFamily: "Helvetica-Bold" }]}>
                  {formatDate(validUntil)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Project info */}
        <View style={base.summaryBox}>
          <Text style={[base.label, { marginBottom: spacing.sm }]}>Obiectivul lucrării</Text>
          <Text style={[base.h2, { marginBottom: 4 }]}>
            {projectCode ? `${projectCode} — ${projectTitle}` : projectTitle}
          </Text>
          {projectAddress && <Text style={base.body}>{projectAddress}</Text>}
        </View>

        {/* Chapter summary */}
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[base.h3, { marginBottom: spacing.md }]}>Rezumat capitole</Text>
          <View style={base.tableHeader}>
            <Text style={[base.tableHeaderCell, { width: 60 }]}>Cod</Text>
            <Text style={[base.tableHeaderCell, { flex: 1 }]}>Capitol</Text>
            {subtotalMaterial !== undefined && (
              <Text style={[base.tableHeaderCell, { width: 90, textAlign: "right" }]}>
                Materiale
              </Text>
            )}
            {subtotalLabor !== undefined && (
              <Text style={[base.tableHeaderCell, { width: 90, textAlign: "right" }]}>
                Manoperă
              </Text>
            )}
            <Text style={[base.tableHeaderCell, { width: 100, textAlign: "right" }]}>Total</Text>
          </View>
          {chapters.map((ch, i) => (
            <View key={i} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
              <Text style={[base.tableCell, { width: 60, color: colors.gray40 }]}>{ch.code}</Text>
              <Text style={[base.tableCell, { flex: 1 }]}>{ch.title}</Text>
              {ch.subtotalMaterial !== undefined && (
                <Text style={[base.tableCell, { width: 90, textAlign: "right" }]}>
                  {formatCurrency(ch.subtotalMaterial, currency)}
                </Text>
              )}
              {ch.subtotalLabor !== undefined && (
                <Text style={[base.tableCell, { width: 90, textAlign: "right" }]}>
                  {formatCurrency(ch.subtotalLabor, currency)}
                </Text>
              )}
              <Text
                style={[
                  base.tableCell,
                  { width: 100, textAlign: "right", fontFamily: "Helvetica-Bold" },
                ]}
              >
                {formatCurrency(ch.subtotal, currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ alignItems: "flex-end", marginTop: spacing.lg }}>
          <View style={{ width: 280 }}>
            {subtotalMaterial !== undefined && (
              <View style={base.summaryRow}>
                <Text style={base.summaryLabel}>Total materiale</Text>
                <Text style={base.summaryValue}>{formatCurrency(subtotalMaterial, currency)}</Text>
              </View>
            )}
            {subtotalLabor !== undefined && (
              <View style={base.summaryRow}>
                <Text style={base.summaryLabel}>Total manoperă</Text>
                <Text style={base.summaryValue}>{formatCurrency(subtotalLabor, currency)}</Text>
              </View>
            )}
            <View style={base.summaryRow}>
              <Text style={base.summaryLabel}>Subtotal (fără TVA)</Text>
              <Text style={base.summaryValue}>{formatCurrency(subtotal, currency)}</Text>
            </View>
            <View style={base.summaryRow}>
              <Text style={base.summaryLabel}>TVA {(vatRate * 100).toFixed(0)}%</Text>
              <Text style={base.summaryValue}>{formatCurrency(vatAmount, currency)}</Text>
            </View>
            <View style={base.totalRow}>
              <Text style={base.totalLabel}>TOTAL OFERTĂ</Text>
              <Text style={base.totalValue}>{formatCurrency(total, currency)}</Text>
            </View>
          </View>
        </View>

        {notes && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[base.label, { marginBottom: spacing.xs }]}>Condiții și mențiuni</Text>
            <Text style={base.body}>{notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={[base.row, { marginTop: spacing.xxxl, gap: spacing.xxxl }]}>
          <View style={base.col}>
            <View
              style={{ borderTopWidth: 1, borderTopColor: colors.gray40, paddingTop: spacing.xs }}
            >
              <Text style={base.muted}>Executant / {companyName}</Text>
            </View>
          </View>
          <View style={base.col}>
            <View
              style={{ borderTopWidth: 1, borderTopColor: colors.gray40, paddingTop: spacing.xs }}
            >
              <Text style={base.muted}>Beneficiar / {clientName}</Text>
            </View>
          </View>
        </View>

        <View style={base.footer} fixed>
          <Text style={base.footerText}>
            {companyName} · CUI {companyCUI}
          </Text>
          <Text style={base.footerText}>Deviz {devizNumber}</Text>
          <Text
            style={base.footerText}
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} din ${totalPages}`}
          />
        </View>
      </Page>

      {/* Detail pages — one per chapter */}
      {chapters.map((ch) => (
        <Page key={ch.code} size="A4" style={base.page}>
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={base.muted}>
              Deviz {devizNumber} · {projectTitle}
            </Text>
            <Text style={base.h2}>
              Capitol {ch.code} — {ch.title}
            </Text>
          </View>

          <View style={base.tableHeader}>
            <Text style={[base.tableHeaderCell, { width: 50 }]}>Cod</Text>
            <Text style={[base.tableHeaderCell, { flex: 2 }]}>Articol</Text>
            <Text style={[base.tableHeaderCell, { width: 40, textAlign: "center" }]}>U.M.</Text>
            <Text style={[base.tableHeaderCell, { width: 50, textAlign: "right" }]}>Cant.</Text>
            <Text style={[base.tableHeaderCell, { width: 70, textAlign: "right" }]}>Preț/U</Text>
            <Text style={[base.tableHeaderCell, { width: 80, textAlign: "right" }]}>Total</Text>
          </View>

          {ch.items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
              <Text style={[base.tableCell, { width: 50, color: colors.gray40, fontSize: 8 }]}>
                {item.code ?? ""}
              </Text>
              <Text style={[base.tableCell, { flex: 2 }]}>{item.description}</Text>
              <Text
                style={[base.tableCell, { width: 40, textAlign: "center", color: colors.gray40 }]}
              >
                {item.unit}
              </Text>
              <Text style={[base.tableCell, { width: 50, textAlign: "right" }]}>
                {formatNumber(item.quantity)}
              </Text>
              <Text style={[base.tableCell, { width: 70, textAlign: "right" }]}>
                {formatCurrency(item.unitPriceTotal, currency)}
              </Text>
              <Text
                style={[
                  base.tableCell,
                  { width: 80, textAlign: "right", fontFamily: "Helvetica-Bold" },
                ]}
              >
                {formatCurrency(item.total, currency)}
              </Text>
            </View>
          ))}

          <View style={{ alignItems: "flex-end", marginTop: spacing.lg }}>
            <View style={{ width: 220 }}>
              {ch.subtotalMaterial !== undefined && (
                <View style={base.summaryRow}>
                  <Text style={base.summaryLabel}>Total materiale</Text>
                  <Text style={base.summaryValue}>
                    {formatCurrency(ch.subtotalMaterial, currency)}
                  </Text>
                </View>
              )}
              {ch.subtotalLabor !== undefined && (
                <View style={base.summaryRow}>
                  <Text style={base.summaryLabel}>Total manoperă</Text>
                  <Text style={base.summaryValue}>
                    {formatCurrency(ch.subtotalLabor, currency)}
                  </Text>
                </View>
              )}
              <View style={base.totalRow}>
                <Text style={[base.totalLabel, { fontSize: 11 }]}>Total capitol</Text>
                <Text style={[base.totalValue, { fontSize: 12 }]}>
                  {formatCurrency(ch.subtotal, currency)}
                </Text>
              </View>
            </View>
          </View>

          <View style={base.footer} fixed>
            <Text style={base.footerText}>
              {companyName} · Deviz {devizNumber}
            </Text>
            <Text style={base.footerText}>
              Capitol {ch.code} — {ch.title}
            </Text>
            <Text
              style={base.footerText}
              render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
            />
          </View>
        </Page>
      ))}
    </Document>
  )
}
