import React from "react"
import { Document, Page, View, Text } from "@react-pdf/renderer"
import { base, colors, spacing } from "../styles"
import { formatCurrency, formatDate } from "../format"

export interface ContractClause {
  number: string
  title: string
  content: string
}

export interface ContractProps {
  contractNumber: string
  contractDate: string
  currency?: string

  companyName: string
  companyCUI: string
  companyAddress: string
  companyRepresentative: string
  companyTitle?: string
  companyIBAN?: string
  companyBank?: string

  clientName: string
  clientCUI?: string
  clientCNP?: string
  clientAddress: string
  clientRepresentative?: string

  projectTitle: string
  projectAddress?: string
  projectCode?: string

  serviceDescription: string
  contractValue: number
  paymentSchedule?: string
  startDate: string
  endDate: string
  warrantyMonths?: number

  clauses?: ContractClause[]
  additionalTerms?: string
}

export function ContractPdf(props: ContractProps) {
  const {
    contractNumber,
    contractDate,
    currency = "RON",
    companyName,
    companyCUI,
    companyAddress,
    companyRepresentative,
    companyTitle = "Director General",
    companyIBAN,
    companyBank,
    clientName,
    clientCUI,
    clientCNP,
    clientAddress,
    clientRepresentative,
    projectTitle,
    projectAddress,
    projectCode,
    serviceDescription,
    contractValue,
    paymentSchedule,
    startDate,
    endDate,
    warrantyMonths,
    clauses = [],
    additionalTerms,
  } = props

  const defaultClauses: ContractClause[] = [
    {
      number: "1",
      title: "Obiectul contractului",
      content: `Prestatorul se obligă să execute ${serviceDescription} pentru obiectivul ${projectTitle}${projectAddress ? ` situat la ${projectAddress}` : ""}, conform devizului ofertă anexat la prezentul contract.`,
    },
    {
      number: "2",
      title: "Durata contractului",
      content: `Lucrările vor începe la data de ${formatDate(startDate)} și vor fi finalizate până la data de ${formatDate(endDate)}. Termenul poate fi prelungit prin act adițional, cu acordul ambelor părți.`,
    },
    {
      number: "3",
      title: "Valoarea contractului și modalitatea de plată",
      content: `Valoarea totală a contractului este de ${formatCurrency(contractValue, currency)} (inclusiv TVA 19%).${paymentSchedule ? ` ${paymentSchedule}` : " Plata se va efectua în baza facturilor emise de prestator."}`,
    },
    {
      number: "4",
      title: "Obligațiile prestatorului",
      content:
        "Prestatorul se obligă să execute lucrările cu personal calificat și cu materiale corespunzătoare, să respecte normele tehnice și de siguranță în vigoare, să remedieze orice deficiențe constatate în perioada de garanție.",
    },
    {
      number: "5",
      title: "Obligațiile beneficiarului",
      content:
        "Beneficiarul se obligă să asigure accesul la obiectiv, să achite contravaloarea lucrărilor la termenele stabilite, să notifice prestatorul în scris cu privire la orice deficiențe constatate.",
    },
    {
      number: "6",
      title: "Garanție",
      content: `Prestatorul acordă garanție de ${warrantyMonths ?? 24} luni pentru lucrările executate, de la data recepției finale.`,
    },
    {
      number: "7",
      title: "Forță majoră",
      content:
        "Niciuna dintre părți nu răspunde de neexecutarea la termen sau/și de executarea în condiții necorespunzătoare a obligațiilor care îi revin dacă neexecutarea sau executarea necorespunzătoare a fost cauzată de forță majoră.",
    },
    {
      number: "8",
      title: "Litigii",
      content:
        "Orice litigiu decurgând din sau în legătură cu prezentul contract se soluționează pe cale amiabilă. În caz de neînțelegere, litigiile vor fi soluționate de instanțele judecătorești competente.",
    },
    ...clauses,
  ]

  return (
    <Document title={`Contract ${contractNumber}`} author={companyName} creator="PRV Platform">
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: spacing.xxl }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Helvetica-Bold",
              color: colors.black,
              marginBottom: spacing.xs,
            }}
          >
            CONTRACT DE PRESTĂRI SERVICII
          </Text>
          <Text style={base.body}>
            Nr. {contractNumber} / {formatDate(contractDate)}
          </Text>
        </View>

        <View style={base.dividerHeavy} />

        {/* Parties */}
        <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
          <Text style={[base.h3, { marginBottom: spacing.md }]}>Părțile contractante</Text>

          <View style={base.summaryBox}>
            <Text style={[base.label, { marginBottom: spacing.xs }]}>Prestator</Text>
            <Text style={[base.h3, { marginBottom: 4 }]}>{companyName}</Text>
            <Text style={base.body}>CUI: {companyCUI}</Text>
            <Text style={base.body}>Sediu: {companyAddress}</Text>
            {companyIBAN && (
              <Text style={base.body}>
                IBAN: {companyIBAN}
                {companyBank ? ` — ${companyBank}` : ""}
              </Text>
            )}
            <Text style={[base.body, { marginTop: spacing.xs }]}>
              Reprezentată prin:{" "}
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{companyRepresentative}</Text>
              {companyTitle ? `, în calitate de ${companyTitle}` : ""}
            </Text>
          </View>

          <Text style={[base.body, { textAlign: "center", marginVertical: spacing.md }]}>
            — și —
          </Text>

          <View style={base.summaryBox}>
            <Text style={[base.label, { marginBottom: spacing.xs }]}>Beneficiar</Text>
            <Text style={[base.h3, { marginBottom: 4 }]}>{clientName}</Text>
            {clientCUI && <Text style={base.body}>CUI: {clientCUI}</Text>}
            {clientCNP && <Text style={base.body}>CNP: {clientCNP}</Text>}
            <Text style={base.body}>Adresă: {clientAddress}</Text>
            {clientRepresentative && (
              <Text style={[base.body, { marginTop: spacing.xs }]}>
                Reprezentat prin:{" "}
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{clientRepresentative}</Text>
              </Text>
            )}
          </View>
        </View>

        {/* Project */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[base.label, { marginBottom: spacing.xs }]}>Obiectivul lucrărilor</Text>
          <Text style={[base.h3, { marginBottom: 4 }]}>
            {projectCode ? `${projectCode} — ` : ""}
            {projectTitle}
          </Text>
          {projectAddress && <Text style={base.body}>{projectAddress}</Text>}
        </View>

        {/* Clauses */}
        {defaultClauses.map((clause) => (
          <View key={clause.number} style={{ marginBottom: spacing.lg }}>
            <Text style={[base.h3, { marginBottom: spacing.xs }]}>
              Art. {clause.number}. {clause.title}
            </Text>
            <Text style={[base.body, { lineHeight: 1.6 }]}>{clause.content}</Text>
          </View>
        ))}

        {additionalTerms && (
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[base.h3, { marginBottom: spacing.xs }]}>Prevederi finale</Text>
            <Text style={[base.body, { lineHeight: 1.6 }]}>{additionalTerms}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={[base.section, { marginTop: spacing.xxl }]}>
          <Text
            style={[
              base.body,
              { marginBottom: spacing.xl, textAlign: "center", color: colors.gray60 },
            ]}
          >
            Prezentul contract a fost încheiat în 2 (două) exemplare originale, câte unul pentru
            fiecare parte.
          </Text>
          <View style={[base.row, { gap: spacing.xl }]}>
            <View style={base.col}>
              <Text style={[base.label, { marginBottom: spacing.xs }]}>Prestator</Text>
              <Text style={[base.body, { fontFamily: "Helvetica-Bold", marginBottom: spacing.xs }]}>
                {companyName}
              </Text>
              <Text style={base.small}>{companyRepresentative}</Text>
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.gray40,
                  marginTop: spacing.xxxl,
                  paddingTop: spacing.xs,
                }}
              >
                <Text style={base.muted}>Semnătură și ștampilă</Text>
              </View>
            </View>
            <View style={base.col}>
              <Text style={[base.label, { marginBottom: spacing.xs }]}>Beneficiar</Text>
              <Text style={[base.body, { fontFamily: "Helvetica-Bold", marginBottom: spacing.xs }]}>
                {clientName}
              </Text>
              {clientRepresentative && <Text style={base.small}>{clientRepresentative}</Text>}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.gray40,
                  marginTop: spacing.xxxl,
                  paddingTop: spacing.xs,
                }}
              >
                <Text style={base.muted}>Semnătură și ștampilă</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={base.footer} fixed>
          <Text style={base.footerText}>
            {companyName} · CUI {companyCUI}
          </Text>
          <Text style={base.footerText}>Contract nr. {contractNumber}</Text>
          <Text
            style={base.footerText}
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} din ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
