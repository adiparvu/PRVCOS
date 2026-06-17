import React from "react"
import { Document, Page, View, Text } from "@react-pdf/renderer"
import { base, colors, spacing } from "../styles"
import { formatCurrency, formatDate, formatNumber } from "../format"

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit?: string
  unitPrice: number
  vatRate?: number
  total: number
}

export interface InvoiceProps {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  currency?: string
  locale?: string

  // Emitent
  companyName: string
  companyAddress: string
  companyCUI: string
  companyRegCom?: string
  companyIBAN?: string
  companyBank?: string
  companyEmail?: string

  // Client
  clientName: string
  clientAddress?: string
  clientCUI?: string

  // Items
  items: InvoiceLineItem[]

  // Totals
  subtotal: number
  vatAmount: number
  vatRate?: number
  total: number

  // Meta
  notes?: string
  paymentTerms?: string
  status?: "draft" | "sent" | "paid" | "overdue"
}

export function InvoicePdf(props: InvoiceProps) {
  const {
    invoiceNumber,
    issueDate,
    dueDate,
    currency = "RON",
    companyName,
    companyAddress,
    companyCUI,
    companyRegCom,
    companyIBAN,
    companyBank,
    companyEmail,
    clientName,
    clientAddress,
    clientCUI,
    items,
    subtotal,
    vatAmount,
    vatRate = 0.19,
    total,
    notes,
    paymentTerms,
    status,
  } = props

  const statusLabel: Record<string, string> = {
    draft: "CIORNĂ",
    sent: "TRIMISĂ",
    paid: "ACHITATĂ",
    overdue: "RESTANTĂ",
  }

  return (
    <Document title={`Factură ${invoiceNumber}`} author={companyName} creator="PRV Platform">
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View style={[base.row, { marginBottom: spacing.xxl }]}>
          <View style={base.col}>
            <Text style={[base.h1, { marginBottom: 2 }]}>{companyName}</Text>
            <Text style={base.small}>{companyAddress}</Text>
            <Text style={base.small}>CUI: {companyCUI}</Text>
            {companyRegCom && <Text style={base.small}>Reg. Com.: {companyRegCom}</Text>}
            {companyEmail && <Text style={base.small}>{companyEmail}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold", color: colors.black }}>
              FACTURĂ
            </Text>
            <Text style={[base.h2, { marginTop: spacing.xs }]}>Nr. {invoiceNumber}</Text>
            {status && (
              <View
                style={{
                  marginTop: spacing.xs,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 4,
                  backgroundColor: status === "paid" ? colors.gray05 : colors.black,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: "Helvetica-Bold",
                    color: status === "paid" ? colors.black : colors.white,
                  }}
                >
                  {statusLabel[status] ?? status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Dates + Client */}
        <View style={[base.row, { marginBottom: spacing.xxl }]}>
          <View style={base.col}>
            <Text style={base.label}>Facturat către</Text>
            <Text style={[base.h3, { marginBottom: 2 }]}>{clientName}</Text>
            {clientAddress && <Text style={base.small}>{clientAddress}</Text>}
            {clientCUI && <Text style={base.small}>CUI: {clientCUI}</Text>}
          </View>
          <View style={{ width: 160 }}>
            <View style={{ marginBottom: spacing.sm }}>
              <Text style={base.label}>Data emiterii</Text>
              <Text style={base.value}>{formatDate(issueDate)}</Text>
            </View>
            <View>
              <Text style={base.label}>Scadentă</Text>
              <Text style={[base.value, { fontFamily: "Helvetica-Bold" }]}>
                {formatDate(dueDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Table header */}
        <View style={base.tableHeader}>
          <Text style={[base.tableHeaderCell, { flex: 3 }]}>Descriere</Text>
          <Text style={[base.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Cant.</Text>
          <Text style={[base.tableHeaderCell, { width: 60, textAlign: "right" }]}>U.M.</Text>
          <Text style={[base.tableHeaderCell, { width: 80, textAlign: "right" }]}>Preț/U</Text>
          <Text style={[base.tableHeaderCell, { width: 90, textAlign: "right" }]}>Total</Text>
        </View>

        {/* Table rows */}
        {items.map((item, i) => (
          <View key={i} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
            <Text style={[base.tableCell, { flex: 3 }]}>{item.description}</Text>
            <Text style={[base.tableCell, { flex: 1, textAlign: "center" }]}>
              {formatNumber(item.quantity, 2)}
            </Text>
            <Text style={[base.tableCell, { width: 60, textAlign: "right", color: colors.gray40 }]}>
              {item.unit ?? "buc"}
            </Text>
            <Text style={[base.tableCell, { width: 80, textAlign: "right" }]}>
              {formatCurrency(item.unitPrice, currency)}
            </Text>
            <Text
              style={[
                base.tableCell,
                { width: 90, textAlign: "right", fontFamily: "Helvetica-Bold" },
              ]}
            >
              {formatCurrency(item.total, currency)}
            </Text>
          </View>
        ))}

        {/* Summary */}
        <View style={{ alignItems: "flex-end", marginTop: spacing.lg }}>
          <View style={{ width: 240 }}>
            <View style={base.summaryRow}>
              <Text style={base.summaryLabel}>Subtotal (fără TVA)</Text>
              <Text style={base.summaryValue}>{formatCurrency(subtotal, currency)}</Text>
            </View>
            <View style={base.summaryRow}>
              <Text style={base.summaryLabel}>TVA {(vatRate * 100).toFixed(0)}%</Text>
              <Text style={base.summaryValue}>{formatCurrency(vatAmount, currency)}</Text>
            </View>
            <View style={base.totalRow}>
              <Text style={base.totalLabel}>TOTAL DE PLATĂ</Text>
              <Text style={base.totalValue}>{formatCurrency(total, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Payment details */}
        {(companyIBAN || companyBank) && (
          <View style={[base.summaryBox, { marginTop: spacing.xl }]}>
            <Text style={[base.h3, { marginBottom: spacing.sm }]}>Detalii plată</Text>
            {companyIBAN && (
              <View style={[base.row, { marginBottom: spacing.xs }]}>
                <Text style={[base.label, { width: 60, marginBottom: 0 }]}>IBAN</Text>
                <Text style={base.value}>{companyIBAN}</Text>
              </View>
            )}
            {companyBank && (
              <View style={base.row}>
                <Text style={[base.label, { width: 60, marginBottom: 0 }]}>Bancă</Text>
                <Text style={base.value}>{companyBank}</Text>
              </View>
            )}
            {paymentTerms && (
              <View style={[base.row, { marginTop: spacing.xs }]}>
                <Text style={[base.label, { width: 60, marginBottom: 0 }]}>Termen</Text>
                <Text style={base.value}>{paymentTerms}</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {notes && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[base.label, { marginBottom: spacing.xs }]}>Mențiuni</Text>
            <Text style={base.body}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>
            {companyName} · CUI {companyCUI}
          </Text>
          <Text style={base.footerText}>Factură {invoiceNumber}</Text>
          <Text
            style={base.footerText}
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} din ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
