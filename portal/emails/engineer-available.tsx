import { escapeHtml } from '@/lib/sanitize'

interface EngineerAvailableEmailProps {
  engineerName: string
  focusAreas: string[]
  whatExcitesYou?: string
}

export function EngineerAvailableEmail({
  engineerName,
  focusAreas,
  whatExcitesYou,
}: EngineerAvailableEmailProps) {
  const safeName = escapeHtml(engineerName)
  const safeExcites = whatExcitesYou ? escapeHtml(whatExcitesYou) : undefined
  const tagsHtml = focusAreas.map((area) =>
    `<span style="display:inline-block;background:#E8E8E8;border:1px solid #2C2C2C;padding:2px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;margin-bottom:4px;">${escapeHtml(area)}</span>`
  ).join('')

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
    h1 { font-size: 24px; margin: 0 0 16px; }
    p { font-size: 16px; line-height: 1.6; margin: 0 0 16px; color: #5A5A5A; }
    .tags { margin-bottom: 24px; }
    .cta { display: inline-block; background: #FFFFFF; color: #C7547C; border: 3px solid #C7547C; padding: 16px 32px; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none; box-shadow: 4px 4px 0 #C7547C; }
    .footer { padding: 16px 24px; border-top: 1px solid #D0D0D0; font-size: 11px; color: #5A5A5A; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title-bar">New Engineer Available</div>
    <div class="content">
      <h1>${safeName} is now available for cycles</h1>
      <div class="tags">${tagsHtml}</div>
      ${safeExcites ? `<p><em>"${safeExcites}"</em></p>` : ''}
      <p>Have a feature to build? Submit a request and we'll match you.</p>
      <p style="text-align: center; margin-top: 32px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.fractaltech.nyc'}/cycles" class="cta">Browse Engineers</a>
      </p>
    </div>
    <div class="footer">
      Fractal Bootcamp &middot; fractaltech.nyc<br>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.fractaltech.nyc'}/settings" style="color: #5A5A5A;">Manage email preferences</a>
    </div>
  </div>
</body>
</html>
  `.trim()
}
