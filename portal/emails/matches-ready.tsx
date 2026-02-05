import { escapeHtml } from '@/lib/sanitize'

interface MatchesReadyEmailProps {
  engineerName: string
  matchCount: number
  dashboardUrl: string
}

export function MatchesReadyEmail({
  engineerName,
  matchCount,
  dashboardUrl,
}: MatchesReadyEmailProps) {
  const safeName = escapeHtml(engineerName)
  const safeUrl = escapeHtml(dashboardUrl)

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
    .match-count { display: inline-block; background: rgba(201,168,108,0.2); color: #8B7355; font-size: 18px; font-weight: 700; padding: 8px 16px; border-radius: 4px; margin-bottom: 16px; }
    .cta { display: inline-block; background: #2C2C2C; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .cta:hover { background: #5C5C5C; }
    .footer { padding: 16px 24px; border-top: 1px solid #D0D0D0; font-size: 11px; color: #5A5A5A; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title-bar">Your Matches Are Ready</div>
    <div class="content">
      <h1>Hey ${safeName}, your matches are in</h1>
      <p>We scored hundreds of jobs against your profile and found your top fits.</p>
      <div class="match-count">${matchCount} match${matchCount === 1 ? '' : 'es'}</div>
      <p>Each match is ranked across five dimensions &mdash; mission, technical fit, culture, environment, and career trajectory. Check them out and let us know which ones resonate.</p>
      <a href="${safeUrl}" class="cta">View Your Matches</a>
    </div>
    <div class="footer">
      Fractal Tech &middot; fractaltech.nyc
    </div>
  </div>
</body>
</html>
  `.trim()
}
