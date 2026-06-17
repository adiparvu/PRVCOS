import React from "react"
import { Document, Page, View, Text } from "@react-pdf/renderer"
import { base, colors, spacing } from "../styles"
import { formatDate } from "../format"

export interface CertificateProps {
  recipientName: string
  courseTitle: string
  courseCategory?: string
  instructorName?: string
  completedAt: string
  certificateNumber: string

  companyName: string
  companyCUI?: string

  durationHours?: number
  grade?: string
}

export function CertificatePdf(props: CertificateProps) {
  const {
    recipientName,
    courseTitle,
    courseCategory,
    instructorName,
    completedAt,
    certificateNumber,
    companyName,
    durationHours,
    grade,
  } = props

  return (
    <Document title={`Certificat — ${courseTitle}`} author={companyName} creator="PRV Platform">
      <Page
        size="A4"
        orientation="landscape"
        style={[base.page, { paddingHorizontal: 72, paddingVertical: 72 }]}
      >
        {/* Decorative border */}
        <View
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            borderWidth: 2,
            borderColor: colors.gray20,
            borderRadius: 4,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 30,
            left: 30,
            right: 30,
            bottom: 30,
            borderWidth: 1,
            borderColor: colors.gray10,
            borderRadius: 4,
          }}
        />

        {/* Company name */}
        <Text
          style={[base.label, { textAlign: "center", marginBottom: spacing.lg, letterSpacing: 3 }]}
        >
          {companyName.toUpperCase()}
        </Text>

        {/* Certificate title */}
        <Text
          style={{
            fontSize: 32,
            fontFamily: "Helvetica-Bold",
            color: colors.black,
            textAlign: "center",
            letterSpacing: 1,
          }}
        >
          CERTIFICAT DE ABSOLVIRE
        </Text>

        <View
          style={[
            base.divider,
            { width: 120, alignSelf: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
          ]}
        />

        {/* Certify text */}
        <Text
          style={[
            base.body,
            { textAlign: "center", marginBottom: spacing.sm, color: colors.gray60 },
          ]}
        >
          Prin prezentul se atestă că
        </Text>

        <Text
          style={{
            fontSize: 26,
            fontFamily: "Helvetica-Bold",
            color: colors.black,
            textAlign: "center",
            marginBottom: spacing.md,
          }}
        >
          {recipientName}
        </Text>

        <Text
          style={[
            base.body,
            { textAlign: "center", marginBottom: spacing.sm, color: colors.gray60 },
          ]}
        >
          a absolvit cu succes cursul
        </Text>

        <Text style={[base.h2, { textAlign: "center", fontSize: 16, marginBottom: spacing.xs }]}>
          {courseTitle}
        </Text>

        {courseCategory && (
          <Text style={[base.muted, { textAlign: "center", marginBottom: spacing.xl }]}>
            Categorie: {courseCategory}
          </Text>
        )}

        {/* Details row */}
        <View
          style={[base.row, { justifyContent: "center", gap: spacing.xxl, marginTop: spacing.lg }]}
        >
          <View style={{ alignItems: "center" }}>
            <Text style={base.label}>Data finalizării</Text>
            <Text style={[base.value, { fontFamily: "Helvetica-Bold" }]}>
              {formatDate(completedAt)}
            </Text>
          </View>
          {durationHours && (
            <View style={{ alignItems: "center" }}>
              <Text style={base.label}>Durata</Text>
              <Text style={[base.value, { fontFamily: "Helvetica-Bold" }]}>
                {durationHours} ore
              </Text>
            </View>
          )}
          {grade && (
            <View style={{ alignItems: "center" }}>
              <Text style={base.label}>Calificativ</Text>
              <Text style={[base.value, { fontFamily: "Helvetica-Bold" }]}>{grade}</Text>
            </View>
          )}
        </View>

        {/* Signatures */}
        <View style={[base.row, { marginTop: spacing.xxxl, gap: 80, justifyContent: "center" }]}>
          {instructorName && (
            <View style={{ alignItems: "center", width: 160 }}>
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.gray40,
                  paddingTop: spacing.xs,
                  width: "100%",
                }}
              />
              <Text style={base.muted}>{instructorName}</Text>
              <Text style={[base.muted, { fontSize: 7 }]}>Instructor</Text>
            </View>
          )}
          <View style={{ alignItems: "center", width: 160 }}>
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.gray40,
                paddingTop: spacing.xs,
                width: "100%",
              }}
            />
            <Text style={base.muted}>{companyName}</Text>
            <Text style={[base.muted, { fontSize: 7 }]}>Director General</Text>
          </View>
        </View>

        {/* Certificate number */}
        <Text
          style={[
            base.muted,
            { textAlign: "center", marginTop: spacing.xl, fontSize: 7, letterSpacing: 1 },
          ]}
        >
          Nr. {certificateNumber} · Generat de PRV Platform
        </Text>
      </Page>
    </Document>
  )
}
