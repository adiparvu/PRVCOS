"use client"

import { useState } from "react"

// Public presentation site of PRV Renovations (preview approved 2026-07).
// Covers the PUBLIC APPLICATION section of the product vision end to end:
// hero, statistics, the eight named services, recent projects, before/after,
// reviews, contact and the quote form — which posts into the same CRM lead
// pipeline as the mobile app (POST /api/public/leads).
//
// The API lives in apps/web. In production, this site's origin must be in
// the web app's ALLOWED_ORIGINS env, or the CSRF origin check rejects the
// quote POST (ops step, documented in the deploy checklist).

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://app.prvrenovations.ro"
const COMPANY_SLUG = "prv-renovations"

const SERVICES = [
  { glyph: "⌂", title: "Renovări interioare", desc: "Apartamente și case, la cheie sau pe etape." },
  { glyph: "▣", title: "Băi", desc: "Hidroizolație, sanitare, finisaje premium." },
  { glyph: "◫", title: "Bucătării", desc: "Reconfigurare completă, trasee noi, montaj." },
  { glyph: "☰", title: "Pardoseli", desc: "Parchet, gresie, microciment, șape." },
  { glyph: "◧", title: "Zugrăveli", desc: "Gleturi, vopsele lavabile, tapet, stucco." },
  { glyph: "⚡︎", title: "Electrice", desc: "Rebranșări, tablouri, smart home." },
  { glyph: "◍", title: "Sanitare", desc: "Instalații complete, centrale, calorifere." },
  { glyph: "▤", title: "Spații comerciale", desc: "Birouri, HoReCa, retail — cu aviz și proiect." },
] as const

const STATS = [
  { value: "240+", label: "Proiecte finalizate" },
  { value: "12 ani", label: "De experiență" },
  { value: "98%", label: "Predări la termen" },
  { value: "4.9★", label: "Rating mediu clienți" },
] as const

const PROJECTS = [
  { title: "Penthouse Aviatorilor", detail: "Renovare completă · 210 m² · 2026", tall: true },
  { title: "Clinica DentArt", detail: "Spațiu comercial · 140 m²" },
  { title: "Apartament Pipera", detail: "La cheie · 86 m²" },
  { title: "Casa Corbeanca", detail: "Extindere + renovare · 240 m²" },
  { title: "Birouri Timpuri Noi", detail: "Fit-out · 320 m²" },
] as const

const REVIEWS = [
  {
    quote:
      "Au predat cu trei zile înainte de termen. Comunicare zilnică, șantier curat, zero surprize la deviz.",
    who: "Ioana & Radu M.",
    where: "Apartament, Pipera",
  },
  {
    quote:
      "Singura echipă din patru care a venit cu propuneri, nu doar cu prețuri. Baia arată ca în randare.",
    who: "Cristian D.",
    where: "Casă, Corbeanca",
  },
  {
    quote:
      "Clinica a rămas funcțională pe durata lucrărilor — au lucrat pe faze, noaptea și în weekend.",
    who: "Dr. Elena V.",
    where: "Spațiu comercial, Floreasca",
  },
] as const

function SectionHeading({ label, title, lead }: { label: string; title: string; lead?: string }) {
  return (
    <>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">{label}</div>
      <h2 className="mt-2.5 text-[26px] font-bold tracking-tight text-white/95 sm:text-[32px]">
        {title}
      </h2>
      {lead && <p className="mt-3 max-w-[560px] text-base leading-relaxed text-white/65">{lead}</p>}
    </>
  )
}

const glass =
  "relative overflow-hidden rounded-[20px] border border-white/12 bg-white/[0.06] " +
  "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/25 before:content-['']"

function BeforeAfter() {
  const [pos, setPos] = useState(50)
  return (
    <div className={`${glass} mt-9 aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9]`}>
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(120deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        }}
      >
        <span className="absolute bottom-5 left-5 rounded-full border border-white/12 bg-black/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white/95 backdrop-blur-md">
          Înainte
        </span>
      </div>
      <div
        className="absolute inset-y-0 right-0 border-l border-white/[0.32]"
        style={{
          left: `${pos}%`,
          background: "linear-gradient(120deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))",
        }}
      >
        <span className="absolute bottom-5 right-5 rounded-full border border-white/12 bg-black/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white/95 backdrop-blur-md">
          După
        </span>
      </div>
      <input
        type="range"
        min={10}
        max={90}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compară înainte și după — glisează pentru a muta linia"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 flex h-[34px] w-[34px] -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[13px] font-bold text-black"
        style={{ left: `calc(${pos}% - 17px)` }}
      >
        ⇄
      </span>
    </div>
  )
}

type FormState = "idle" | "sending" | "sent" | "error" | "invalid"

function QuoteForm() {
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [service, setService] = useState("")
  const [message, setMessage] = useState("")
  const [state, setState] = useState<FormState>("idle")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedContact = contact.trim()
    if (!name.trim() || !trimmedContact) {
      setState("invalid")
      return
    }
    const isEmail = trimmedContact.includes("@")
    setState("sending")
    try {
      const res = await fetch(`${API_BASE}/api/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companySlug: COMPANY_SLUG,
          name: name.trim(),
          ...(isEmail ? { email: trimmedContact } : { phone: trimmedContact }),
          message: [service, message.trim()].filter(Boolean).join(" — ").slice(0, 2000),
          source: "marketing_site",
        }),
      })
      setState(res.ok ? "sent" : "error")
    } catch {
      setState("error")
    }
  }

  if (state === "sent") {
    return (
      <div className={`${glass} p-8 text-center`} role="status">
        <div aria-hidden="true" className="text-2xl text-white/50">
          ✓
        </div>
        <p className="mt-3 text-[15px] font-semibold text-white/95">Cererea a plecat</p>
        <p className="mx-auto mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-white/65">
          Te contactăm în aceeași zi lucrătoare pentru programarea vizitei de evaluare — gratuită.
        </p>
      </div>
    )
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3.5 text-sm text-white/95 " +
    "placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"

  return (
    <form className={`${glass} p-6`} onSubmit={submit} aria-label="Cerere de ofertă">
      <div className="grid gap-x-3 sm:grid-cols-2">
        <div className="mb-3">
          <label htmlFor="q-name" className="mb-1.5 block text-[12.5px] font-medium text-white/65">
            Nume*
          </label>
          <input
            id="q-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            autoComplete="name"
          />
        </div>
        <div className="mb-3">
          <label
            htmlFor="q-contact"
            className="mb-1.5 block text-[12.5px] font-medium text-white/65"
          >
            Telefon sau email*
          </label>
          <input
            id="q-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className={inputCls}
            autoComplete="tel"
          />
        </div>
      </div>
      <div className="mb-3">
        <label htmlFor="q-service" className="mb-1.5 block text-[12.5px] font-medium text-white/65">
          Serviciu
        </label>
        <select
          id="q-service"
          value={service}
          onChange={(e) => setService(e.target.value)}
          className={`${inputCls} appearance-none`}
        >
          <option value="">Alege serviciul…</option>
          {SERVICES.map((s) => (
            <option key={s.title} value={s.title}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label htmlFor="q-message" className="mb-1.5 block text-[12.5px] font-medium text-white/65">
          Mesaj
        </label>
        <textarea
          id="q-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className={`${inputCls} h-auto py-3`}
        />
      </div>
      {state === "invalid" && (
        <p role="alert" className="mb-3 text-[12.5px] text-white/95">
          Completează numele și un mod de contact (telefon sau email).
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="mb-3 text-[12.5px] text-white/95">
          Trimiterea nu a reușit — încearcă din nou sau sună-ne direct.
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-full bg-white py-3.5 text-[15px] font-bold text-black transition-opacity disabled:opacity-50"
      >
        {state === "sending" ? "Se trimite…" : "Trimite cererea de ofertă"}
      </button>
      <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-white/50">
        Cererea ajunge direct în echipa noastră — fără intermediari. Datele sunt folosite doar
        pentru a te contacta.
      </p>
    </form>
  )
}

export default function RenovationsSite() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <main className="min-h-screen bg-black text-white/95 antialiased">
      {/* Floating pill nav */}
      <div className="mx-auto max-w-[1140px] px-6">
        <nav
          aria-label="Navigație principală"
          className="sticky top-4 z-10 mx-auto mt-4 flex max-w-[860px] items-center justify-between rounded-full border border-white/12 bg-white/[0.08] py-2.5 pl-5 pr-3 backdrop-blur-3xl"
          style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)" }}
        >
          <span className="text-[15px] font-bold tracking-tight">PRV Renovations</span>
          <div className="hidden gap-5 text-[13.5px] text-white/65 sm:flex">
            {(
              [
                ["servicii", "Servicii"],
                ["proiecte", "Proiecte"],
                ["recenzii", "Recenzii"],
                ["contact", "Contact"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="hover:text-white/95">
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => scrollTo("contact")}
            className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-black"
          >
            Cere ofertă
          </button>
        </nav>
      </div>

      {/* Hero */}
      <header className="relative mx-auto max-w-[1140px] px-6 pb-20 pt-24 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">
          Renovări complete · București & Ilfov
        </div>
        <h1 className="mx-auto mt-4 max-w-[800px] text-[36px] font-bold leading-[1.05] tracking-tighter sm:text-[44px] md:text-[56px]">
          Spații care lucrează
          <br />
          <span className="text-white/50">pentru oamenii din ele.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[560px] text-lg leading-relaxed text-white/65">
          De la apartamente la spații comerciale — proiectăm, renovăm și predăm la termen. Cu echipe
          proprii, nu subcontractori anonimi.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => scrollTo("contact")}
            className="rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-black"
          >
            Cere o ofertă gratuită
          </button>
          <button
            onClick={() => scrollTo("proiecte")}
            className="rounded-full border border-white/12 bg-white/[0.08] px-7 py-3.5 text-[15px] font-semibold text-white/95"
          >
            Vezi proiectele →
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="mx-auto max-w-[1140px] px-6">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className={`${glass} px-3 py-6 text-center`}>
              <div className="text-[34px] font-bold tracking-tight">{s.value}</div>
              <div className="mt-1.5 text-[12.5px] text-white/50">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="servicii" className="mx-auto max-w-[1140px] scroll-mt-24 px-6 py-16">
        <SectionHeading
          label="Servicii"
          title="Tot ce are nevoie spațiul tău"
          lead="Opt specializări, o singură echipă responsabilă de la prima vizită la predare."
        />
        <div className="mt-9 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.title} className={`${glass} p-5`}>
              <div aria-hidden="true" className="text-xl text-white/65">
                {s.glyph}
              </div>
              <div className="mt-3 text-[15px] font-semibold">{s.title}</div>
              <div className="mt-1.5 text-[12.5px] leading-normal text-white/50">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section id="proiecte" className="mx-auto max-w-[1140px] scroll-mt-24 px-6 pb-16">
        <SectionHeading label="Proiecte recente" title="Lucrări care vorbesc singure" />
        <div className="mt-9 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          {PROJECTS.map((p) => (
            <div
              key={p.title}
              className={`${glass} flex items-end p-4.5 ${"tall" in p && p.tall ? "lg:row-span-2" : ""}`}
              style={{
                aspectRatio: "tall" in p && p.tall ? undefined : "4/3",
                minHeight: "tall" in p && p.tall ? 320 : undefined,
                backgroundImage:
                  "linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))",
              }}
            >
              <div className="p-1">
                <div className="text-[15px] font-semibold">{p.title}</div>
                <div className="mt-0.5 text-xs text-white/50">{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Before / After */}
      <section className="mx-auto max-w-[1140px] px-6 pb-16">
        <SectionHeading label="Înainte / după" title="Diferența se vede" />
        <BeforeAfter />
      </section>

      {/* Reviews */}
      <section id="recenzii" className="mx-auto max-w-[1140px] scroll-mt-24 px-6 pb-16">
        <SectionHeading label="Recenzii" title="Ce spun clienții" />
        <div className="mt-9 grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <figure key={r.who} className={`${glass} p-6`}>
              <div aria-label="5 din 5 stele" className="text-[13px] tracking-[2px] text-white/95">
                ★★★★★
              </div>
              <blockquote className="mt-3.5 text-[14.5px] leading-relaxed text-white/65">
                {`„${r.quote}”`}
              </blockquote>
              <figcaption className="mt-4">
                <div className="text-[13px] font-semibold">{r.who}</div>
                <div className="mt-0.5 text-xs text-white/50">{r.where}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Contact + quote */}
      <section id="contact" className="mx-auto max-w-[1140px] scroll-mt-24 px-6 pb-16">
        <SectionHeading label="Contact & ofertă" title="Spune-ne ce vrei să schimbi" />
        <div className="mt-9 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="max-w-[480px] text-base leading-relaxed text-white/65">
              Răspundem în aceeași zi lucrătoare. Vizita de evaluare și devizul sunt gratuite.
            </p>
            <div className="mt-5">
              <a
                href="tel:+40215550123"
                className="flex items-center gap-3 border-b border-white/[0.08] py-3.5 text-[14.5px] text-white/65"
              >
                ☏ <b className="font-semibold text-white/95">+40 21 555 0123</b> · L–V, 08–18
              </a>
              <a
                href="mailto:contact@prvrenovations.ro"
                className="flex items-center gap-3 border-b border-white/[0.08] py-3.5 text-[14.5px] text-white/65"
              >
                ✉ <b className="font-semibold text-white/95">contact@prvrenovations.ro</b>
              </a>
              <div className="flex items-center gap-3 py-3.5 text-[14.5px] text-white/65">
                ▣ Str. Fabricii 12, București
              </div>
            </div>
          </div>
          <QuoteForm />
        </div>
      </section>

      <footer className="mx-auto mt-6 flex max-w-[1140px] flex-wrap justify-between gap-3 border-t border-white/[0.08] px-6 py-9 pb-14 text-[12.5px] text-white/50">
        <span>© 2026 PRV Renovations SRL</span>
        <span>Politica de confidențialitate · ANPC</span>
      </footer>
    </main>
  )
}
