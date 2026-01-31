import { escapeHtml } from '@/lib/sanitize'

interface CohortUpdateEmailProps {
  weekNumber: number
  totalWeeks: number
  title?: string
  description?: string
  engineerCount: number
  highlightItems?: string[]
}

export function CohortUpdateEmail({
  weekNumber,
  totalWeeks,
  title,
  description,
  engineerCount,
  highlightItems = [],
}: CohortUpdateEmailProps) {
  const safeTitle = title ? escapeHtml(title) : undefined
  const safeDescription = description ? escapeHtml(description) : undefined
  const itemsHtml = highlightItems.length > 0
    ? `<ul>${highlightItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : ''

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
    h1 { font-size: 24px; margin: 0 0 8px; }
    h2 { font-size: 18px; margin: 24px 0 8px; }
    p { font-size: 16px; line-height: 1.6; margin: 0 0 16px; color: #5A5A5A; }
    .stats { display: flex; gap: 12px; margin-bottom: 24px; }
    .stat { background: #E8E8E8; border: 2px solid #2C2C2C; padding: 8px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    ul { padding-left: 24px; margin: 0 0 24px; }
    li { font-size: 16px; line-height: 1.8; color: #5A5A5A; }
    .cta { display: inline-block; background: #FFFFFF; color: #C7547C; border: 3px solid #C7547C; padding: 16px 32px; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none; box-shadow: 4px 4px 0 #C7547C; }
    .footer { padding: 16px 24px; border-top: 1px solid #D0D0D0; font-size: 11px; color: #5A5A5A; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title-bar">Cohort Update — Week ${weekNumber}</div>
    <div class="content">
      <h1>Week ${weekNumber} of ${totalWeeks}</h1>
      ${safeTitle ? `<h2>${safeTitle}</h2>` : ''}
      ${safeDescription ? `<p>${safeDescription}</p>` : ''}
      <div class="stats">
        <div class="stat">Week ${weekNumber}/${totalWeeks}</div>
        <div class="stat">${engineerCount} Engineers</div>
      </div>
      ${itemsHtml}
      <p style="text-align: center; margin-top: 32px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.fractaltech.nyc'}/dashboard" class="cta">View Dashboard</a>
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
