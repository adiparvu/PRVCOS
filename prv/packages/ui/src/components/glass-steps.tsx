"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type StepStatus = "pending" | "active" | "completed"
export type StepsVariant = "h" | "v"

export interface StepItem {
  id: string
  label: string
  sublabel?: string
  description?: string
  content?: React.ReactNode
}

export interface GlassStepsProps {
  steps: StepItem[]
  currentStep: number
  variant?: StepsVariant
  animated?: boolean
  onStepClick?: (index: number) => void
  showNav?: boolean
  onNext?: () => void
  onPrev?: () => void
  className?: string
  style?: React.CSSProperties
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const BLUE = "rgba(10,132,255"

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function circleStyle(status: StepStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
    transition: "all 300ms cubic-bezier(0.34,1.56,0.64,1)",
  }
  if (status === "completed") {
    return {
      ...base,
      border: `2px solid ${BLUE},0.6)`,
      background: `${BLUE},0.2)`,
      color: `${BLUE},0.9)`,
    }
  }
  if (status === "active") {
    return {
      ...base,
      border: `2px solid ${BLUE},0.8)`,
      background: `${BLUE},0.12)`,
      color: `${BLUE},0.9)`,
    }
  }
  return {
    ...base,
    border: "2px solid var(--prv-border)",
    background: "var(--prv-g1)",
    color: "var(--prv-text-4)",
  }
}

function statusOf(index: number, currentStep: number): StepStatus {
  if (index < currentStep) return "completed"
  if (index === currentStep) return "active"
  return "pending"
}

// ── Horizontal step ───────────────────────────────────────────────────────────

function HStep({
  step,
  index,
  status,
  isLast,
  animated,
  onClick,
}: {
  step: StepItem
  index: number
  status: StepStatus
  isLast: boolean
  animated: boolean
  onClick?: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        flex: 1,
      }}
    >
      {/* Connector line */}
      {!isLast && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 16,
            left: "calc(50% + 16px)",
            right: "calc(-50% + 16px)",
            height: 1,
            background: status === "completed" ? `${BLUE},0.4)` : "var(--prv-border-subtle)",
            transition: animated ? "background 400ms" : undefined,
          }}
        />
      )}

      {/* Circle */}
      <button
        type="button"
        aria-label={step.label}
        aria-current={status === "active" ? "step" : undefined}
        onClick={onClick}
        style={{
          ...circleStyle(status),
          cursor: onClick ? "pointer" : "default",
          background: circleStyle(status).background,
        }}
      >
        {status === "completed" ? <CheckIcon /> : index + 1}
      </button>

      {/* Labels */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color:
            status === "active"
              ? "var(--prv-text-1)"
              : status === "completed"
                ? "var(--prv-text-3)"
                : "var(--prv-text-4)",
          marginTop: 8,
          textAlign: "center",
          transition: animated ? "color 300ms" : undefined,
        }}
      >
        {step.label}
      </div>
      {step.sublabel && (
        <div
          style={{
            fontSize: 11,
            color: status === "active" ? "var(--prv-text-3)" : "var(--prv-text-4)",
            marginTop: 2,
            textAlign: "center",
          }}
        >
          {step.sublabel}
        </div>
      )}
    </div>
  )
}

// ── Vertical step ─────────────────────────────────────────────────────────────

function VStep({
  step,
  index,
  status,
  isLast,
  animated,
  onClick,
}: {
  step: StepItem
  index: number
  status: StepStatus
  isLast: boolean
  animated: boolean
  onClick?: () => void
}) {
  return (
    <div style={{ display: "flex", gap: 14, position: "relative" }}>
      {/* Spine: circle + line */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          width: 32,
        }}
      >
        <button
          type="button"
          aria-label={step.label}
          aria-current={status === "active" ? "step" : undefined}
          onClick={onClick}
          style={{
            ...circleStyle(status),
            cursor: onClick ? "pointer" : "default",
          }}
        >
          {status === "completed" ? <CheckIcon /> : index + 1}
        </button>

        {!isLast && (
          <div
            aria-hidden="true"
            style={{
              flex: 1,
              width: 1,
              background: status === "completed" ? `${BLUE},0.3)` : "var(--prv-border-subtle)",
              margin: "4px 0",
              minHeight: 24,
              transition: animated ? "background 400ms" : undefined,
            }}
          />
        )}
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          paddingBottom: isLast ? 0 : 24,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color:
              status === "active"
                ? "var(--prv-text-1)"
                : status === "completed"
                  ? "var(--prv-text-2)"
                  : "var(--prv-text-4)",
            marginTop: 4,
            lineHeight: 1,
            transition: animated ? "color 300ms" : undefined,
          }}
        >
          {step.label}
        </div>

        {step.description && (
          <div
            style={{
              fontSize: 12,
              color: status === "active" ? "var(--prv-text-3)" : "var(--prv-text-4)",
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            {step.description}
          </div>
        )}

        {/* Active content slot */}
        {status === "active" && step.content && (
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 12,
              padding: "14px 16px",
              marginTop: 10,
              fontSize: 13,
              color: "var(--prv-text-3)",
            }}
          >
            {step.content}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassSteps({
  steps,
  currentStep,
  variant = "h",
  animated = true,
  onStepClick,
  showNav = false,
  onNext,
  onPrev,
  className,
  style,
}: GlassStepsProps) {
  return (
    <div
      className={clsx("relative overflow-hidden", className)}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 20,
        ...style,
      }}
    >
      {/* Top specular edge */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)",
          pointerEvents: "none",
        }}
      />

      {variant === "h" ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            padding: "24px 20px",
          }}
        >
          {steps.map((step, i) => (
            <HStep
              key={step.id}
              step={step}
              index={i}
              status={statusOf(i, currentStep)}
              isLast={i === steps.length - 1}
              animated={animated}
              onClick={onStepClick ? () => onStepClick(i) : undefined}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 20,
          }}
        >
          {steps.map((step, i) => (
            <VStep
              key={step.id}
              step={step}
              index={i}
              status={statusOf(i, currentStep)}
              isLast={i === steps.length - 1}
              animated={animated}
              onClick={onStepClick ? () => onStepClick(i) : undefined}
            />
          ))}
        </div>
      )}

      {/* Optional navigation buttons */}
      {showNav && (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "0 20px 20px",
          }}
        >
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={onPrev}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: currentStep === 0 ? "not-allowed" : "pointer",
              opacity: currentStep === 0 ? 0.35 : 1,
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border-subtle)",
              color: "var(--prv-text-2)",
              transition: "background 150ms",
            }}
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            style={{
              padding: "8px 20px",
              borderRadius: 10,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: "var(--prv-text-1)",
              border: "1px solid transparent",
              color: "#000",
              transition: "background 150ms",
            }}
          >
            {currentStep === steps.length - 1 ? "Complete" : "Next →"}
          </button>
        </div>
      )}
    </div>
  )
}
