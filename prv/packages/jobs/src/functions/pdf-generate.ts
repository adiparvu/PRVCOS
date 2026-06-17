import { inngest } from "../client"

const BUCKET = "documents"

export const pdfGenerateFunction = inngest.createFunction(
  {
    id: "prv-pdf-generate",
    name: "PDF Generation & Upload",
    retries: 3,
    concurrency: { limit: 10 },
    timeouts: { finish: "5m" },
  },
  { event: "prv/pdf.generate" },
  async ({ event, step }) => {
    const {
      template,
      entityId,
      entityType,
      companyId,
      requestedBy,
      storagePath,
      propsJson,
      notifyUserId,
    } = event.data

    // Step 1: Render PDF to buffer
    const pdfResult = await step.run("render-pdf", async () => {
      const { createElement } = await import("react")
      const { generatePdfBuffer, InvoicePdf, PayslipPdf, DevizPdf, CertificatePdf, ContractPdf } =
        await import("@prv/pdf")

      const props = JSON.parse(propsJson) as Record<string, unknown>

      const templateMap = {
        invoice: InvoicePdf,
        payslip: PayslipPdf,
        deviz: DevizPdf,
        certificate: CertificatePdf,
        contract: ContractPdf,
      } as const

      const Component = templateMap[template]
      const element = createElement(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Component as any,
        props
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any

      const result = await generatePdfBuffer(element)
      if (!result.success) throw new Error(`PDF render failed: ${result.error}`)

      return { base64: result.buffer.toString("base64"), bytes: result.bytes }
    })

    // Step 2: Upload to Supabase Storage
    const uploadResult = await step.run("upload-to-storage", async () => {
      const { createClient } = await import("@supabase/supabase-js")

      const supabase = createClient(
        process.env["SUPABASE_URL"]!,
        process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
        { auth: { persistSession: false } }
      )

      const buffer = Buffer.from(pdfResult.base64, "base64")

      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
        metadata: {
          companyId,
          entityType,
          entityId,
          requestedBy,
          generatedAt: new Date().toISOString(),
        },
      })

      if (error) throw new Error(`Storage upload failed: ${error.message}`)

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

      return { publicUrl: urlData.publicUrl }
    })

    // Step 3: Emit pdf.ready event
    await step.sendEvent("emit-pdf-ready", {
      name: "prv/pdf.ready",
      data: {
        entityId,
        entityType,
        companyId,
        storagePath,
        publicUrl: uploadResult.publicUrl,
        bytes: pdfResult.bytes,
        generatedAt: new Date().toISOString(),
      },
    })

    // Step 4: Optionally notify the requester
    if (notifyUserId) {
      await step.run("notify-user", async () => {
        const { db } = await import("@prv/db")
        const { notifications } = await import("@prv/db/schema")

        await db.insert(notifications).values({
          userId: notifyUserId,
          companyId,
          type: "success",
          channel: "in_app",
          title: "Document generat",
          body: `Documentul PDF (${template}) este disponibil.`,
          entityType,
          entityId,
          actionUrl: uploadResult.publicUrl,
          deliveredAt: new Date(),
          metadata: { template, storagePath, bytes: pdfResult.bytes },
        })
      })
    }

    return {
      template,
      entityId,
      storagePath,
      publicUrl: uploadResult.publicUrl,
      bytes: pdfResult.bytes,
    }
  }
)
