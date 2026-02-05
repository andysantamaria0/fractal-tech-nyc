import { escapeHtml } from '@/lib/sanitize'

interface EngineerMatchNotificationEmailProps {
  companyName: string
  roleTitle: string
  overallScore: number
  highlightQuote: string | null
  jdUrl: string
}

export function EngineerMatchNotificationEmail({
  companyName,
  roleTitle,
  overallScore,
  highlightQuote,
  jdUrl,
}: EngineerMatchNotificationEmailProps) {
  const safeCompany = escapeHtml(companyName)
  const safeRole = escapeHtml(roleTitle)
  const safeQuote = highlightQuote ? escapeHtml(highlightQuote) : null
  const safeUrl = escapeHtml(jdUrl)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Geneva, Chicago, -apple-system, sans-serif; color: #2C2C2C; background: #F5F5F0; margin: 0; padding: 32px 16px; }
    .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 2px solid #2C2C2C; box-shadow: 4px 4px 0 rgba(0,0,0,0.15); }
    .title-bar { background: #E8E8E8; padding: 8px 12px; border-bottom: 2px solid #2C2C2C; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .content { padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #5A5A5A; }
    .score-badge { display: inline-block; background: rgba(201,168,108,0.2); color: #8B7355; font-size: 18px; font-weight: 700; padding: 8px 16px; border-radius: 4px; margin-bottom: 16px; }
    .quote { font-style: italic; font-size: 15px; line-height: 1.6; color: #5A5A5A; border-left: 3px solid #C9A86C; padding: 8px 16px; margin: 16px 0; background: #FAF8F5; }
    .cta { display: inline-block; background: #2C2C2C; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .cta:hover { background: #5C5C5C; }
    .footer { padding: 16px 24px; border-top: 1px solid #D0D0D0; font-size: 11px; color: #5A5A5A; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title-bar">Match Notification</div>
    <div class="content">
      <h1>${safeCompany} is interested in you</h1>
      <p>${safeCompany} would like to connect with you about their <strong>${safeRole}</strong> role.</p>
      <div class="score-badge">${overallScore}% match</div>
      ${safeQuote ? `<div class="quote">"${safeQuote}"</div>` : ''}
      <p>View the full job description and let us know if you're interested:</p>
      <a href="${safeUrl}" class="cta">View Role &amp; Respond</a>
    </div>
    <div class="footer">
      Fractal Tech &middot; fractaltech.nyc
    </div>
  </div>
</body>
</html>
  `.trim()
}
