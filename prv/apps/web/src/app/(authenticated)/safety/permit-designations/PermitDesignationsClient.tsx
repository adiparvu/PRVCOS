"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useToast } from "@prv/ui"
import type { PermitDesignationDto } from "@/app/api/safety/permit-designations/route"
import type { PermitDesignationRole } from "@/lib/ptw"

type Person = { id: string; firstName: string; lastName: string; role: string }

const ROLE_LABEL: Record<PermitDesignationRole, string> = {
  supervisor: "Supervizor",
  safety_officer: "Responsabil SSM/PSI",
}

const card: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 18,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
  overflow: "hidden",
}
const input: React.CSSProperties = {
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--prv-border)",
  borderRadius: 10,
  padding: "9px 10px",
  color: "var(--prv-text-1)",
  fontSize: 13.5,
  fontFamily: "inherit",
}

export function PermitDesignationsClient() {
  const { toast } = useToast()
  const [designations, setDesignations] = useState<PermitDesignationDto[] | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState("")
  const [role, setRole] = useState<PermitDesignationRole>("safety_officer")

  const load = useCallback(() => {
    return fetch("/api/safety/permit-designations")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { designations: PermitDesignationDto[]; canManage: boolean }) => {
        setDesignations(d.designations)
        setCanManage(d.canManage)
      })
      .catch(() => setDesignations([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (canManage && people.length === 0) {
      fetch("/api/people?limit=200")
        .then((r) => r.json())
        .then((d: { members?: Person[] }) => setPeople(d.members ?? []))
        .catch(() => setPeople([]))
    }
  }, [canManage, people.length])

  const add = () => {
    if (!pick || busy) return
    setBusy(true)
    fetch("/api/safety/permit-designations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: pick, role }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Add failed")
        }
        setPick("")
        await load()
        toast.success("Desemnare adăugată")
      })
      .catch((e) => toast.error("Nu s-a putut adăuga", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  const retract = (d: PermitDesignationDto) => {
    if (
      !window.confirm(
        `Retragi desemnarea „${ROLE_LABEL[d.role]}" pentru ${d.userName ?? "utilizator"}?`
      )
    )
      return
    setBusy(true)
    fetch(`/api/safety/permit-designations/${d.id}`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Delete failed")
        await load()
        toast.success("Desemnare retrasă")
      })
      .catch(() => toast.error("Nu s-a putut retrage"))
      .finally(() => setBusy(false))
  }

  const groups: { role: PermitDesignationRole; rows: PermitDesignationDto[] }[] = [
    {
      role: "safety_officer",
      rows: (designations ?? []).filter((d) => d.role === "safety_officer"),
    },
    { role: "supervisor", rows: (designations ?? []).filter((d) => d.role === "supervisor") },
  ]

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px 80px" }}>
      <Link
        href="/safety/permits"
        style={{ color: "rgba(10,132,255,0.9)", fontSize: 13, textDecoration: "none" }}
      >
        ← Permise de lucru
      </Link>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em", marginTop: 6 }}>
        Desemnări permise
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Cine poate acționa ca supervizor sau responsabil SSM/PSI pe permisele de lucru. Doar
        persoanele desemnate pot fi alese ca aprobatori la crearea unui permis.
      </div>

      {canManage && (
        <div
          style={{
            ...card,
            padding: 18,
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "1fr 190px auto",
            gap: 10,
          }}
        >
          <select value={pick} onChange={(e) => setPick(e.target.value)} style={input}>
            <option value="">Alege persoană…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as PermitDesignationRole)}
            style={input}
          >
            <option value="safety_officer">Responsabil SSM/PSI</option>
            <option value="supervisor">Supervizor</option>
          </select>
          <button
            type="button"
            disabled={!pick || busy}
            onClick={add}
            style={{
              background: pick ? "#fff" : "rgba(255,255,255,0.07)",
              color: pick ? "#000" : "var(--prv-text-3)",
              border: "none",
              borderRadius: 10,
              padding: "9px 18px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: pick && !busy ? "pointer" : "default",
            }}
          >
            Desemnează
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
        {designations === null ? (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>
        ) : (
          groups.map((g) => (
            <div key={g.role} style={card}>
              <div
                style={{
                  padding: "12px 18px 10px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.75)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {ROLE_LABEL[g.role]} · {g.rows.length}
              </div>
              {g.rows.length === 0 ? (
                <div style={{ padding: "14px 18px", color: "var(--prv-text-3)", fontSize: 13 }}>
                  Nimeni desemnat încă.
                </div>
              ) : (
                g.rows.map((d, i) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 18px",
                      borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}
                  >
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 560 }}>
                      {d.userName ?? "—"}
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => retract(d)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "rgba(255,69,58,0.85)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Retrage
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </div>

      {designations !== null && !canManage && (
        <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--prv-text-3)" }}>
          Gestionarea desemnărilor este disponibilă doar rolurilor de conducere.
        </div>
      )}
    </div>
  )
}
