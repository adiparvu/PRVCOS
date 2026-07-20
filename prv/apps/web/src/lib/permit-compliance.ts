// Phase 18.3 follow-up — Permit-to-Work compliance metrics (pure logic).
//
// Governance signal for PTW: of the permits that have TERMINATED, how many were
// properly closed out vs. lapsed (expired) or revoked. A high close-out rate means
// work is being formally signed off rather than left to expire uncontrolled.

export interface PermitComplianceInput {
  total: number
  draft: number
  pendingApproval: number
  approved: number
  active: number
  closed: number
  rejected: number
  expired: number
  suspended: number
  revoked: number
  activeExpired: number // stored active/approved but past validTo (pre-sweep)
}

export interface PermitCompliance extends PermitComplianceInput {
  liveValid: number // active and still within the validity window
  terminated: number // closed + expired + revoked
  complianceRate: number // closed / terminated, 0..100 (100 when nothing terminated)
  atRisk: number // permits needing attention: past-window but not yet closed/expired
}

export function computePermitCompliance(input: PermitComplianceInput): PermitCompliance {
  const terminated = input.closed + input.expired + input.revoked
  const complianceRate = terminated > 0 ? Math.round((input.closed / terminated) * 100) : 100
  const liveValid = Math.max(0, input.active - input.activeExpired)
  return {
    ...input,
    liveValid,
    terminated,
    complianceRate,
    atRisk: input.activeExpired,
  }
}
