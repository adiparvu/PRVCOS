// Base HTML email template — monochrome PRV brand
export function baseTemplate(content: string, previewText: string = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ""}
  <title>PRV</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">PRV</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.35);">
                PRV — Company Operating System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Text style helpers for email
export const emailStyles = {
  h1: "font-size:28px;font-weight:700;color:#ffffff;margin:0 0 16px;letter-spacing:-0.5px;",
  h2: "font-size:20px;font-weight:600;color:#ffffff;margin:0 0 12px;",
  body: "font-size:16px;line-height:26px;color:rgba(255,255,255,0.65);margin:0 0 24px;",
  muted: "font-size:14px;color:rgba(255,255,255,0.35);margin:0;",
  button:
    "display:inline-block;background:#ffffff;color:#000000;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:100px;",
  divider: "border:none;border-top:1px solid rgba(255,255,255,0.12);margin:24px 0;",
} as const
