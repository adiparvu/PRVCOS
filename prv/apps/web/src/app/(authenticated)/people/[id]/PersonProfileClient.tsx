"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PresenceRing } from "@/components/presence/PresenceRing"
import { PresenceStatusBadge } from "@/components/presence/PresenceStatusBadge"
import {
  SocialProfilesRenderer,
  type SocialProfile,
} from "@/components/social-profiles/SocialProfilesRenderer"
import { SocialProfilesEditor } from "@/components/social-profiles/SocialProfilesEditor"
import { ContactActions } from "../components/ContactActions"
import { ContactBusinessCard } from "../components/ContactBusinessCard"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonData {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string | null
  jobTitle: string | null
  department?: string | null
  avatarUrl: string | null
  bio: string | null
  role: string
  memberSince: string
}

interface PresenceData {
  status: string
  statusMessage: string | null
  isManualOverride: boolean
  manualOverrideExpiresAt: string | null
  lastSeenAt: string | null
}

export interface ProfileStats {
  attendancePct: number | null
  shiftsThisMonth: number
  activeProjects: number
}
export interface ProfileShift {
  id: string
  title: string
  location: string | null
  date: string
  startTime: string
  endTime: string
}
export interface ProfileColleague {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
  status: string
}
export interface ProfileActivity {
  id: string
  action: string
  entityType: string | null
  createdAt: string
}

interface PersonProfileClientProps {
  person: PersonData
  presence: PresenceData
  socialProfiles: SocialProfile[]
  companyId: string
  isOwnProfile: boolean
  stats: ProfileStats
  upcomingShifts: ProfileShift[]
  colleagues: ProfileColleague[]
  recentActivity: ProfileActivity[]
}

// ── Profile formatting helpers ──────────────────────────────────────────────
function humanizeActivity(action: string): string {
  const parts = action.split(".")
  const verb = parts[parts.length - 1] ?? action
  const noun = parts.length > 1 ? (parts[parts.length - 2] ?? "") : ""
  const fmt = (x: string) => x.replace(/_/g, " ")
  const label = (noun ? `${fmt(noun)} ${fmt(verb)}` : fmt(verb)).trim()
  return label.charAt(0).toUpperCase() + label.slice(1)
}
function activityTypeFor(action: string): ActivityType {
  if (/attendance|clock|check/i.test(action)) return "check_in"
  if (/approv/i.test(action)) return "approval"
  if (/document|upload|file/i.test(action)) return "document"
  if (/shift|schedule/i.test(action)) return "shift"
  return "task"
}
function fmtActivityTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
function toMinutes(t: string): number {
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GlassRow({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[.1em] mb-2 mt-5 mx-1"
      style={{ color: "rgba(255,255,255,0.28)" }}
    >
      {children}
    </p>
  )
}

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[18px] overflow-hidden relative ${className}`}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      {children}
    </div>
  )
}

// Stats strip
function StatsStrip({ stats }: { stats: ProfileStats }) {
  const items = [
    {
      label: "Attendance",
      value: stats.attendancePct != null ? `${stats.attendancePct}%` : "—",
      sub: "this month",
    },
    { label: "Shifts", value: String(stats.shiftsThisMonth), sub: "this month" },
    { label: "Projects", value: String(stats.activeProjects), sub: "active" },
  ]
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map(({ label, value, sub }) => (
        <div
          key={label}
          className="rounded-[16px] text-center py-3 px-2"
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <p
            className="text-[22px] font-bold tracking-tight leading-none mb-1"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            {value}
          </p>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {label}
          </p>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            {sub}
          </p>
        </div>
      ))}
    </div>
  )
}

// Skills section
// NOTE: skills have no backend table yet — kept as sample data until a
// user_skills schema + endpoint exists. All other profile sections use real data.
const MOCK_SKILLS = [
  "Operations",
  "Inventory",
  "Team Lead",
  "Scheduling",
  "Reporting",
  "Safety",
  "Training",
]

function SkillsSection({ isOwnProfile }: { isOwnProfile: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionLabel>Skills & Expertise</SectionLabel>
        {isOwnProfile && (
          <button className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            Edit
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {MOCK_SKILLS.map((skill) => (
          <span
            key={skill}
            className="px-3 py-1.5 rounded-[100px] text-[12px] font-medium"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.60)",
            }}
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  )
}

// Activity feed
type ActivityType = "check_in" | "task" | "approval" | "document" | "shift"

interface ActivityEntry {
  id: string
  type: ActivityType
  title: string
  time: string
}

const ACTIVITY_ICON: Record<ActivityType, string> = {
  check_in: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  task: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  approval:
    "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z",
  document:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  shift: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
}

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  check_in: "rgba(48,209,88,0.75)",
  task: "rgba(255,255,255,0.55)",
  approval: "rgba(10,132,255,0.75)",
  document: "rgba(255,255,255,0.40)",
  shift: "rgba(255,159,10,0.75)",
}

function ActivityFeed({ activity }: { activity: ProfileActivity[] }) {
  if (activity.length === 0) {
    return (
      <GlassPanel>
        <p className="text-[12px] text-center py-6" style={{ color: "rgba(255,255,255,0.30)" }}>
          No recent activity
        </p>
      </GlassPanel>
    )
  }
  return (
    <GlassPanel>
      {activity.map((entry, i) => {
        const type = activityTypeFor(entry.action)
        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 px-4 py-3"
            style={{
              borderBottom: i < activity.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            {/* Icon */}
            <div
              className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={ACTIVITY_COLOR[type]}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={ACTIVITY_ICON[type]} />
              </svg>
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-medium leading-snug"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                {humanizeActivity(entry.action)}
                {entry.entityType ? ` · ${entry.entityType.replace(/_/g, " ")}` : ""}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>
                {fmtActivityTime(entry.createdAt)}
              </p>
            </div>
          </div>
        )
      })}
    </GlassPanel>
  )
}

// Upcoming shifts
function UpcomingShifts({ shifts }: { shifts: ProfileShift[] }) {
  if (shifts.length === 0) {
    return (
      <GlassPanel>
        <p className="text-[12px] text-center py-6" style={{ color: "rgba(255,255,255,0.30)" }}>
          No upcoming shifts
        </p>
      </GlassPanel>
    )
  }
  return (
    <GlassPanel>
      {shifts.map((shift, i) => {
        const d = new Date(`${shift.date}T12:00:00`)
        const day = d.toLocaleDateString("en-US", { weekday: "short" })
        const dom = String(d.getDate())
        const durH =
          Math.round(((toMinutes(shift.endTime) - toMinutes(shift.startTime)) / 60) * 10) / 10
        return (
          <div
            key={shift.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              borderBottom: i < shifts.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            {/* Date chip */}
            <div
              className="w-[44px] flex-shrink-0 rounded-[10px] py-2 text-center"
              style={{
                background: i === 0 ? "rgba(10,132,255,0.14)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${i === 0 ? "rgba(10,132,255,0.25)" : "rgba(255,255,255,0.10)"}`,
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase"
                style={{ color: i === 0 ? "rgba(10,132,255,0.90)" : "rgba(255,255,255,0.35)" }}
              >
                {day}
              </p>
              <p
                className="text-[18px] font-bold leading-tight"
                style={{ color: i === 0 ? "rgba(10,132,255,0.95)" : "rgba(255,255,255,0.75)" }}
              >
                {dom}
              </p>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-semibold leading-snug"
                style={{ color: "rgba(255,255,255,0.82)" }}
              >
                {shift.startTime} – {shift.endTime}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {shift.location ?? shift.title}
              </p>
            </div>

            {/* Duration pill */}
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-[100px]"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.40)",
              }}
            >
              {durH}h
            </span>
          </div>
        )
      })}
    </GlassPanel>
  )
}

// Colleagues / team presence
function statusDot(status: string): string {
  if (status === "online") return "rgba(48,209,88,0.9)"
  if (status === "away" || status === "busy" || status === "in_meeting")
    return "rgba(255,159,10,0.9)"
  return "rgba(255,255,255,0.25)"
}
function statusLabel(status: string): string {
  if (status === "online") return "Active"
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
}

function TeamSection({ colleagues }: { colleagues: ProfileColleague[] }) {
  if (colleagues.length === 0) {
    return (
      <GlassPanel>
        <p className="text-[12px] text-center py-6" style={{ color: "rgba(255,255,255,0.30)" }}>
          No teammates yet
        </p>
      </GlassPanel>
    )
  }
  return (
    <GlassPanel>
      {colleagues.map((c, i) => (
        <div
          key={c.id}
          className="flex items-center gap-3 px-4 py-2.5"
          style={{
            borderBottom: i < colleagues.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
          }}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.70)",
              }}
            >
              {c.initials}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
              style={{
                background: statusDot(c.status),
                border: "1.5px solid var(--prv-bg)",
              }}
            />
          </div>
          <p className="flex-1 text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.72)" }}>
            {c.name}
          </p>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
            {statusLabel(c.status)}
          </span>
        </div>
      ))}
    </GlassPanel>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PersonProfileClient({
  person,
  presence,
  socialProfiles,
  isOwnProfile,
  stats,
  upcomingShifts,
  colleagues,
  recentActivity,
}: PersonProfileClientProps) {
  const router = useRouter()
  const [showSocialEditor, setShowSocialEditor] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview")

  return (
    <div className="min-h-svh" style={{ background: "var(--prv-bg)" }}>
      {/* Nav */}
      <div className="px-4 pt-14 pb-2 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "var(--prv-border-subtle)",
            border: "1px solid var(--prv-g2)",
          }}
          aria-label="Back"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--prv-text-2)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="text-white/45 text-[14px]">People</p>
      </div>

      <div className="px-4 pb-28 max-w-2xl mx-auto">
        {/* Hero header */}
        <div className="flex items-start gap-5 pt-4 pb-5">
          <PresenceRing
            status={presence.status}
            size={96}
            avatarUrl={person.avatarUrl}
            name={person.fullName}
          />
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-white/90 text-[22px] font-semibold leading-tight">
              {person.fullName}
            </h1>
            {person.jobTitle && (
              <p className="text-white/50 text-[15px] mt-0.5">{person.jobTitle}</p>
            )}
            {person.department && (
              <p className="text-white/30 text-[13px] mt-0.5">{person.department}</p>
            )}
            <div className="mt-2">
              <PresenceStatusBadge
                status={
                  presence.status as import("@/components/presence/PresenceDot").PresenceStatus
                }
                message={presence.statusMessage}
              />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <ContactActions email={person.email} phone={person.phone} />

        {/* Stats strip */}
        <div className="mt-4">
          <StatsStrip stats={stats} />
        </div>

        {/* Segment tabs */}
        <div
          className="mt-4 p-1 rounded-[14px] flex gap-1"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {(["overview", "activity"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-[11px] text-[13px] font-semibold capitalize transition-all"
              style={{
                background: activeTab === tab ? "rgba(255,255,255,0.12)" : "transparent",
                color: activeTab === tab ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.35)",
                boxShadow:
                  activeTab === tab
                    ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 4px rgba(0,0,0,0.4)"
                    : "none",
                transition: "all 250ms cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <div className="space-y-1 mt-4">
            {/* Bio */}
            {person.bio && (
              <div
                className="p-4 rounded-[18px] mb-3"
                style={{
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
                }}
              >
                <p className="text-white/55 text-[14px] leading-relaxed">{person.bio}</p>
              </div>
            )}

            {/* Contact info */}
            <SectionLabel>Contact</SectionLabel>
            <GlassPanel>
              {[
                { label: "Email", value: person.email, href: `mailto:${person.email}` },
                {
                  label: "Phone",
                  value: person.phone,
                  href: person.phone ? `tel:${person.phone}` : null,
                },
                { label: "Role", value: person.role.replace(/_/g, " "), href: null },
                {
                  label: "Member since",
                  value: new Date(person.memberSince).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  }),
                  href: null,
                },
              ]
                .filter((r) => r.value)
                .map((row, i, arr) => (
                  <GlassRow key={row.label} last={i === arr.length - 1}>
                    <span className="text-white/35 text-[13px]">{row.label}</span>
                    {row.href ? (
                      <a
                        href={row.href}
                        className="text-white/65 text-[13px] font-medium"
                        style={{ textDecoration: "none" }}
                      >
                        {row.value}
                      </a>
                    ) : (
                      <span className="text-white/65 text-[13px] font-medium">{row.value}</span>
                    )}
                  </GlassRow>
                ))}
            </GlassPanel>

            {/* Skills */}
            <SkillsSection isOwnProfile={isOwnProfile} />

            {/* Upcoming shifts */}
            <SectionLabel>Upcoming Shifts</SectionLabel>
            <UpcomingShifts shifts={upcomingShifts} />

            {/* Team */}
            <SectionLabel>Team on Shift</SectionLabel>
            <TeamSection colleagues={colleagues} />

            {/* Social profiles */}
            {(socialProfiles.length > 0 || isOwnProfile) && (
              <div>
                <div className="flex items-center justify-between mt-5 mb-2">
                  <SectionLabel>Social Profiles</SectionLabel>
                  {isOwnProfile && (
                    <button
                      onClick={() => setShowSocialEditor(true)}
                      className="text-[12px] text-white/40 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {socialProfiles.length > 0 ? (
                  <SocialProfilesRenderer profiles={socialProfiles} mode="chip" />
                ) : (
                  isOwnProfile && (
                    <button
                      onClick={() => setShowSocialEditor(true)}
                      className="text-[13px] text-white/30"
                    >
                      + Add social profiles
                    </button>
                  )
                )}
              </div>
            )}

            {/* Business card */}
            <div className="mt-3">
              <ContactBusinessCard userId={person.id} />
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <SectionLabel>Recent Activity</SectionLabel>
            <ActivityFeed activity={recentActivity} />
          </div>
        )}
      </div>

      {showSocialEditor && (
        <SocialProfilesEditor
          userId={person.id}
          profiles={socialProfiles}
          onClose={() => setShowSocialEditor(false)}
        />
      )}
    </div>
  )
}
