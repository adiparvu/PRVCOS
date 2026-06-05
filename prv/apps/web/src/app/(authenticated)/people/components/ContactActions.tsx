"use client"

interface ContactActionsProps {
  email?: string | null
  phone?: string | null
}

const ACTION_ICONS = {
  call: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l1-1a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  more: "M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM12 20a1 1 0 1 1 0-2 1 1 0 0 1 0 2z",
}

export function ContactActions({ email, phone }: ContactActionsProps) {
  const actions = [
    { icon: ACTION_ICONS.call, label: "Call", href: phone ? `tel:${phone}` : null },
    { icon: ACTION_ICONS.mail, label: "Mail", href: email ? `mailto:${email}` : null },
    { icon: ACTION_ICONS.message, label: "Message", href: null },
    { icon: ACTION_ICONS.more, label: "More", href: null },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ icon, label, href }) => (
        <a
          key={label}
          href={href ?? undefined}
          onClick={!href ? (e) => e.preventDefault() : undefined}
          className="flex flex-col items-center gap-1.5 py-3 rounded-[16px]"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.09)",
            opacity: href ? 1 : 0.4,
            cursor: href ? "pointer" : "not-allowed",
            transition: "background 150ms",
            textDecoration: "none",
          }}
          onMouseEnter={(e) =>
            href && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.11)")
          }
          onMouseLeave={(e) =>
            href && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")
          }
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.70)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={icon} />
          </svg>
          <span className="text-[11px] text-white/55 font-medium">{label}</span>
        </a>
      ))}
    </div>
  )
}
