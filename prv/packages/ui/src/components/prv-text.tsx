import React from "react"
import { clsx } from "clsx"

// HIG type scale — sizes, weights, and letter-spacing from Apple Human Interface Guidelines.
export type TextVariant =
  | "largeTitle"
  | "title1"
  | "title2"
  | "title3"
  | "headline"
  | "body"
  | "callout"
  | "subheadline"
  | "footnote"
  | "caption1"
  | "caption2"

export type TextColor = "primary" | "secondary" | "tertiary" | "disabled"

const variantClass: Record<TextVariant, string> = {
  largeTitle: "text-[34px] font-bold leading-[1.18] tracking-[-0.02em]",
  title1: "text-[28px] font-bold leading-[1.2] tracking-[-0.018em]",
  title2: "text-[22px] font-bold leading-[1.22] tracking-[-0.016em]",
  title3: "text-[20px] font-semibold leading-[1.25] tracking-[-0.014em]",
  headline: "text-[17px] font-semibold leading-[1.29] tracking-[-0.012em]",
  body: "text-[17px] font-normal leading-[1.47] tracking-[-0.012em]",
  callout: "text-[16px] font-normal leading-[1.31] tracking-[-0.010em]",
  subheadline: "text-[15px] font-normal leading-[1.33] tracking-[-0.010em]",
  footnote: "text-[13px] font-normal leading-[1.38] tracking-[-0.008em]",
  caption1: "text-[12px] font-normal leading-[1.33] tracking-[-0.006em]",
  caption2: "text-[11px] font-normal leading-[1.45] tracking-[0.006em]",
}

const colorVar: Record<TextColor, string> = {
  primary: "var(--prv-text-1)",
  secondary: "var(--prv-text-2)",
  tertiary: "var(--prv-text-3)",
  disabled: "var(--prv-text-4)",
}

// Default color per variant — large display text is primary, auxiliary text is secondary/tertiary
const defaultColor: Record<TextVariant, TextColor> = {
  largeTitle: "primary",
  title1: "primary",
  title2: "primary",
  title3: "primary",
  headline: "primary",
  body: "primary",
  callout: "secondary",
  subheadline: "secondary",
  footnote: "secondary",
  caption1: "tertiary",
  caption2: "tertiary",
}

// Default HTML element per variant
const defaultElement: Record<TextVariant, React.ElementType> = {
  largeTitle: "h1",
  title1: "h2",
  title2: "h3",
  title3: "h4",
  headline: "h5",
  body: "p",
  callout: "p",
  subheadline: "p",
  footnote: "p",
  caption1: "span",
  caption2: "span",
}

export interface PRVTextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant
  color?: TextColor
  /** Override the rendered HTML element */
  as?: React.ElementType
  /** Single-line truncation with ellipsis */
  truncate?: boolean
  children: React.ReactNode
}

export function PRVText({
  variant = "body",
  color,
  as,
  truncate = false,
  className,
  style,
  children,
  ...props
}: PRVTextProps) {
  const Tag = as ?? defaultElement[variant]
  const resolvedColor = color ?? defaultColor[variant]

  return (
    <Tag
      className={clsx(variantClass[variant], truncate && "truncate", className)}
      style={{ color: colorVar[resolvedColor], ...style }}
      {...props}
    >
      {children}
    </Tag>
  )
}
