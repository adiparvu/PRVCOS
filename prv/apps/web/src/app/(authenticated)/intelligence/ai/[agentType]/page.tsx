import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { AgentChatClient } from "./AgentChatClient"

export const dynamic = "force-dynamic"

const VALID_AGENTS = ["general", "finance", "hr", "project", "renovation", "report_builder"]

export default async function AgentChatPage({
  params,
}: {
  params: Promise<{ agentType: string }>
}) {
  const { agentType } = await params
  if (!VALID_AGENTS.includes(agentType)) redirect("/intelligence/ai")

  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return <AgentChatClient agentType={agentType} role={session.role} />
}
