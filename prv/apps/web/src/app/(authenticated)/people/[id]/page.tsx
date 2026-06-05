import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { db } from "@prv/db"
import { users, userPresence, socialProfiles } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import type { Metadata } from "next"
import { PersonProfileClient } from "./PersonProfileClient"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const [person] = await db
    .select({ firstName: users.firstName, lastName: users.lastName, jobTitle: users.jobTitle })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!person) return { title: "Profile" }
  return { title: `${person.firstName} ${person.lastName}` }
}

export default async function PersonProfilePage({ params }: Props) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const { id } = await params

  const [person] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      jobTitle: users.jobTitle,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.companyId, session.companyId)))
    .limit(1)

  if (!person) redirect("/people")

  const [presence] = await db
    .select()
    .from(userPresence)
    .where(eq(userPresence.userId, id))
    .limit(1)

  const socialRows = await db
    .select({
      id: socialProfiles.id,
      platform: socialProfiles.platform,
      url: socialProfiles.url,
      displayName: socialProfiles.displayName,
      isPublic: socialProfiles.isPublic,
    })
    .from(socialProfiles)
    .where(and(eq(socialProfiles.userId, id), eq(socialProfiles.companyId, session.companyId)))

  return (
    <PersonProfileClient
      person={{
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: `${person.firstName} ${person.lastName}`,
        email: person.email,
        phone: person.phone ?? null,
        jobTitle: person.jobTitle ?? null,
        avatarUrl: person.avatarUrl ?? null,
        bio: person.bio ?? null,
        role: person.role,
        memberSince: person.createdAt.toISOString(),
      }}
      presence={
        presence
          ? {
              status: presence.status,
              statusMessage: presence.statusMessage ?? null,
              isManualOverride: presence.isManualOverride,
              manualOverrideExpiresAt: presence.manualOverrideExpiresAt?.toISOString() ?? null,
              lastSeenAt: presence.lastSeenAt.toISOString(),
            }
          : {
              status: "offline",
              statusMessage: null,
              isManualOverride: false,
              manualOverrideExpiresAt: null,
              lastSeenAt: null,
            }
      }
      socialProfiles={socialRows.filter((s) => s.isPublic)}
      companyId={session.companyId}
      isOwnProfile={id === session.userId}
    />
  )
}
