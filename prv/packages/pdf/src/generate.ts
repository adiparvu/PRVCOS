import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import type { ReactElement } from "react"

export type PdfResult =
  | { success: true; buffer: Buffer; bytes: number }
  | { success: false; error: string }

export async function generatePdfBuffer(element: ReactElement<DocumentProps>): Promise<PdfResult> {
  try {
    const uint8 = await renderToBuffer(element)
    const buffer = Buffer.from(uint8)
    return { success: true, buffer, bytes: buffer.byteLength }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

export async function generatePdfDataUri(element: ReactElement<DocumentProps>): Promise<string> {
  const result = await generatePdfBuffer(element)
  if (!result.success) throw new Error(result.error)
  return `data:application/pdf;base64,${result.buffer.toString("base64")}`
}
