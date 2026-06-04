import React from "react"
import { clsx } from "clsx"

type ButtonVariant = "primary" | "ghost" | "glass" | "destructive"
type ButtonSize = "sm" | "md" | "lg"

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-white text-black hover:bg-white/90 active:bg-white/80 font-semibold",
  ghost: "text-white/65 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12]",
  glass:
    "bg-white/[0.10] text-white border border-white/[0.12] hover:bg-white/[0.16] active:bg-white/[0.20] backdrop-blur-2xl",
  destructive:
    "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 active:bg-red-500/40",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[10px] gap-1.5",
  md: "h-10 px-4 text-[15px] rounded-[12px] gap-2",
  lg: "h-12 px-6 text-[16px] rounded-[14px] gap-2.5",
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
  children,
  disabled,
  ...props
}: GlassButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={clsx(
        "inline-flex items-center justify-center font-medium",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
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
