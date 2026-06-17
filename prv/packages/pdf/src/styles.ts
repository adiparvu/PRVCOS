import { StyleSheet } from "@react-pdf/renderer"

export const colors = {
  black: "#000000",
  white: "#FFFFFF",
  gray95: "#0D0D0D",
  gray80: "#333333",
  gray60: "#666666",
  gray40: "#999999",
  gray20: "#CCCCCC",
  gray10: "#E6E6E6",
  gray05: "#F5F5F5",
  accent: "#000000",
}

export const fonts = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  oblique: "Helvetica-Oblique",
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
}

export const base = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.black,
    backgroundColor: colors.white,
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 48,
  },
  section: {
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
  },
  col: {
    flex: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray20,
    marginVertical: spacing.md,
  },
  dividerHeavy: {
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    marginVertical: spacing.md,
  },

  // Typography
  h1: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    marginBottom: spacing.xs,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    marginBottom: spacing.xs,
  },
  h3: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: 10,
    color: colors.gray80,
    lineHeight: 1.5,
  },
  small: {
    fontSize: 8,
    color: colors.gray60,
    lineHeight: 1.4,
  },
  muted: {
    fontSize: 9,
    color: colors.gray40,
  },
  label: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.gray60,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: colors.black,
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.gray05,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.gray60,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: colors.gray05,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tableCell: {
    fontSize: 10,
    color: colors.gray80,
  },

  // Badges / Status
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: colors.gray20,
    paddingTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: colors.gray40,
  },

  // Summary box
  summaryBox: {
    backgroundColor: colors.gray05,
    borderWidth: 1,
    borderColor: colors.gray20,
    borderRadius: 4,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.gray60,
  },
  summaryValue: {
    fontSize: 10,
    color: colors.black,
    fontFamily: "Helvetica-Bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: colors.black,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
  },
})
