import { describe, it, expect } from "vitest"
import {
  canTransition,
  canAct,
  allowedActions,
  validatePermitForSubmit,
  requiredFieldsForType,
  isWithinValidity,
  effectivePermitStatus,
  type PermitActor,
} from "@/lib/ptw"

const admin: PermitActor = {
  isRequester: false,
  isSupervisor: false,
  isSafetyOfficer: false,
  isAdmin: true,
}
const requester: PermitActor = {
  isRequester: true,
  isSupervisor: false,
  isSafetyOfficer: false,
  isAdmin: false,
}
const supervisor: PermitActor = {
  isRequester: false,
  isSupervisor: true,
  isSafetyOfficer: false,
  isAdmin: false,
}
const officer: PermitActor = {
  isRequester: false,
  isSupervisor: false,
  isSafetyOfficer: true,
  isAdmin: false,
}

describe("canTransition", () => {
  it("advances the happy path", () => {
    expect(canTransition("draft", "submit")).toEqual({ ok: true, to: "pending_supervisor" })
    expect(canTransition("pending_supervisor", "approve")).toEqual({
      ok: true,
      to: "pending_safety_officer",
    })
    expect(canTransition("pending_safety_officer", "approve")).toEqual({ ok: true, to: "approved" })
    expect(canTransition("approved", "activate")).toEqual({ ok: true, to: "active" })
    expect(canTransition("active", "close")).toEqual({ ok: true, to: "closed" })
  })
  it("rejects from both approval stages -> rejected (terminal)", () => {
    expect(canTransition("pending_supervisor", "reject")).toEqual({ ok: true, to: "rejected" })
    expect(canTransition("pending_safety_officer", "reject")).toEqual({ ok: true, to: "rejected" })
    expect(canTransition("rejected", "submit").ok).toBe(false)
  })
  it("rejects illegal moves", () => {
    expect(canTransition("draft", "approve").ok).toBe(false)
    expect(canTransition("active", "submit").ok).toBe(false)
    expect(canTransition("closed", "close").ok).toBe(false)
  })
})

describe("canAct", () => {
  it("keeps stages separate: supervisor cannot do the safety-officer approval and vice-versa", () => {
    expect(canAct("pending_supervisor", "approve", supervisor)).toBe(true)
    expect(canAct("pending_supervisor", "approve", officer)).toBe(false)
    expect(canAct("pending_safety_officer", "approve", officer)).toBe(true)
    expect(canAct("pending_safety_officer", "approve", supervisor)).toBe(false)
  })
  it("requester cannot self-approve stage 1 but can submit", () => {
    expect(canAct("draft", "submit", requester)).toBe(true)
    expect(canAct("pending_supervisor", "approve", requester)).toBe(false)
  })
  it("admin can act at any legal stage", () => {
    expect(canAct("pending_supervisor", "approve", admin)).toBe(true)
    expect(canAct("pending_safety_officer", "reject", admin)).toBe(true)
    expect(canAct("approved", "activate", admin)).toBe(true)
    // but not an illegal move even as admin
    expect(canAct("draft", "approve", admin)).toBe(false)
  })
})

describe("allowedActions", () => {
  it("draft/requester can only submit", () => {
    expect(allowedActions("draft", requester)).toEqual(["submit"])
  })
  it("safety-officer stage offers approve+reject, not submit", () => {
    const acts = allowedActions("pending_safety_officer", officer)
    expect(acts).toContain("approve")
    expect(acts).toContain("reject")
    expect(acts).not.toContain("submit")
  })
  it("terminal states offer nothing", () => {
    expect(allowedActions("closed", admin)).toEqual([])
    expect(allowedActions("rejected", admin)).toEqual([])
  })
})

describe("validatePermitForSubmit", () => {
  const base = {
    type: "hot_work" as const,
    validFromMs: 1000,
    validToMs: 2000,
    riskAssessment: [{ hazard: "spark", control: "screen", residualRisk: "low" }],
    typeDetails: {
      fireWatch: true,
      extinguisherPresent: true,
      hotWorkEndsAt: "2026-01-01T10:00:00Z",
    },
  }
  it("passes a fully-populated hot_work permit", () => {
    expect(validatePermitForSubmit(base)).toEqual([])
  })
  it("flags empty risk assessment", () => {
    expect(validatePermitForSubmit({ ...base, riskAssessment: [] })).toContain(
      "Evaluarea de risc necesită cel puțin o intrare"
    )
  })
  it("flags an inverted validity window", () => {
    expect(
      validatePermitForSubmit({ ...base, validFromMs: 3000 }).some((e) =>
        e.includes("Valabil de la")
      )
    ).toBe(true)
  })
  it("names a missing required field for confined_space", () => {
    const errs = validatePermitForSubmit({
      type: "confined_space",
      validFromMs: 1,
      validToMs: 2,
      riskAssessment: [{ hazard: "x" }],
      typeDetails: { gasTestLEL: "0", attendant: "u1", rescuePlan: "y" }, // missing gasTestO2
    })
    expect(errs.some((e) => e.includes("gasTestO2"))).toBe(true)
  })
  it("treats a boolean false as present (key-presence gate, not domain rule)", () => {
    const errs = validatePermitForSubmit({
      ...base,
      typeDetails: { fireWatch: false, extinguisherPresent: true, hotWorkEndsAt: "t" },
    })
    expect(errs).toEqual([])
  })
})

describe("requiredFieldsForType", () => {
  it("returns the field set per type", () => {
    expect(requiredFieldsForType("excavation")).toEqual([
      "excavationDepthM",
      "utilitiesChecked",
      "groundSupport",
    ])
    expect(requiredFieldsForType("electrical")).toEqual([
      "isolationApplied",
      "voltage",
      "competentPerson",
    ])
  })
})

describe("isWithinValidity", () => {
  it("is inclusive inside the window and false outside", () => {
    expect(isWithinValidity(100, 200, 150)).toBe(true)
    expect(isWithinValidity(100, 200, 100)).toBe(true)
    expect(isWithinValidity(100, 200, 200)).toBe(true)
    expect(isWithinValidity(100, 200, 99)).toBe(false)
    expect(isWithinValidity(100, 200, 201)).toBe(false)
  })
})

describe("effectivePermitStatus", () => {
  it("shows expired for an active permit past valid_to", () => {
    expect(effectivePermitStatus("active", 100, 200)).toBe("expired")
    expect(effectivePermitStatus("approved", 100, 200)).toBe("expired")
  })
  it("leaves in-window and non-live states untouched", () => {
    expect(effectivePermitStatus("active", 300, 200)).toBe("active")
    expect(effectivePermitStatus("draft", 100, 200)).toBe("draft")
    expect(effectivePermitStatus("closed", 100, 200)).toBe("closed")
    expect(effectivePermitStatus("rejected", 100, 200)).toBe("rejected")
  })
})
