import { NextRequest, NextResponse } from "next/server"
import { withPortalMobileAuth } from "@/lib/mobile/portal-auth"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { handlePortalDocumentUpload } from "@/lib/portal-document-upload"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Mobile mirror of POST /api/portal/documents — same shared upload handler.
export const POST = withPortalMobileAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 })
    }
    return handlePortalDocumentUpload(form, ctx)
  },
  { portalType: "client" }
)
