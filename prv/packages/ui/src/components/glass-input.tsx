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
  style,
  id,
  ...props
}: GlassInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")
  const messageId = inputId ? `${inputId}-message` : undefined

  return (
    <div className={clsx("flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium"
          style={{ color: "var(--prv-text-2)" }}
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span
            className="pointer-events-none absolute left-3.5 flex items-center"
            style={{ color: "var(--prv-text-3)" }}
          >
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={clsx(
            "h-10 w-full rounded-[12px]",
            "border",
            "text-[15px]",
            "px-3.5 py-0",
            "backdrop-blur-xl",
            "transition-all duration-150",
            // Visible keyboard focus — outline-none alone leaves keyboard
            // users navigating blind (WCAG 2.4.7).
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            leftIcon && "pl-10",
            rightElement && "pr-10",
            className
          )}
          style={{
            background: "var(--prv-g1)",
            borderColor: error ? "rgba(255,80,80,0.5)" : "var(--prv-border)",
            color: "var(--prv-text-1)",
            ...style,
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          {...props}
        />
        {rightElement && (
          <span
            className="absolute right-3.5 flex items-center"
            style={{ color: "var(--prv-text-3)" }}
          >
            {rightElement}
          </span>
        )}
      </div>
      {error ? (
        <p
          id={messageId}
          role="alert"
          className="text-[12px]"
          style={{ color: "rgba(255,100,100,0.85)" }}
        >
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[12px]" style={{ color: "var(--prv-text-3)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
