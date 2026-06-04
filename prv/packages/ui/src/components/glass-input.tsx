import React from "react"
import { clsx } from "clsx"

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
  containerClassName?: string
}

export function GlassInput({
  label,
  hint,
  error,
  leftIcon,
  rightElement,
  containerClassName,
  className,
  id,
  ...props
}: GlassInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className={clsx("flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-white/65">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 flex items-center text-white/35">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={clsx(
            "h-10 w-full rounded-[12px]",
            "bg-white/[0.08] border border-white/[0.12]",
            "text-[15px] text-white placeholder:text-white/30",
            "px-3.5 py-0",
            "backdrop-blur-xl",
            "transition-all duration-150",
            "focus:outline-none focus:border-white/30 focus:bg-white/[0.12] focus:ring-1 focus:ring-white/20",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-red-500/50 focus:border-red-400/60 focus:ring-red-400/20",
            leftIcon && "pl-10",
            rightElement && "pr-10",
            className
          )}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3.5 flex items-center text-white/35">{rightElement}</span>
        )}
      </div>
      {error ? (
        <p className="text-[12px] text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-white/35">{hint}</p>
      ) : null}
    </div>
  )
}
