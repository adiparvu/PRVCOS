import React from "react"
import { clsx } from "clsx"

type ButtonVariant = "primary" | "ghost" | "glass" | "destructive"
type ButtonSize = "sm" | "md" | "lg"

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[10px] gap-1.5",
  md: "h-10 px-4 text-[15px] rounded-[12px] gap-2",
  lg: "h-12 px-6 text-[16px] rounded-[14px] gap-2.5",
}

const variantBase: Record<ButtonVariant, string> = {
  primary: "font-semibold",
  ghost: "font-medium",
  glass: "font-medium border backdrop-blur-2xl",
  destructive: "font-medium border",
}

function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case "primary":
      return { background: "var(--prv-text-1)", color: "var(--prv-bg)" }
    case "ghost":
      return { background: "transparent", color: "var(--prv-text-2)" }
    case "glass":
      return {
        background: "var(--prv-g2)",
        color: "var(--prv-text-1)",
        borderColor: "var(--prv-border)",
      }
    case "destructive":
      return {
        background: "var(--prv-g3)",
        color: "var(--prv-text-3)",
        borderColor: "var(--prv-border-strong)",
      }
  }
}

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function GlassButton({
  variant = "glass",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className,
  style,
  children,
  disabled,
  ...props
}: GlassButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={clsx(
        "inline-flex items-center justify-center",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantBase[variant],
        sizeClasses[size],
        className
      )}
      style={{ ...variantStyle(variant), ...style }}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
