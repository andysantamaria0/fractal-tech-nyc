import { escapeHtml } from '@/lib/sanitize'

interface MatchMovedForwardEmailProps {
  companyName: string
  roleTitle: string
  engineerName: string
  overallScore: number
  dimensionScores: {
    mission: number
    technical: number
    culture: number
    environment: number
    dna: number
  }
  highlightQuote: string | null
}

function scoreBar(label: string, score: number): string {
  const width = Math.max(score, 2)
  return `
    <tr>
      <td style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:4px 12px 4px 0;width:100px;color:#5A5A5A;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;">
        <div style="background:#E8E8E8;border-radius:3px;height:8px;width:100%;">
          <div style="background:#C9A86C;border-radius:3px;height:8px;width:${width}%;"></div>
        </div>
      </td>
      <td style="font-size:12px;font-weight:700;padding:4px 0 4px 8px;width:36px;text-align:right;color:#2C2C2C;">${score}</td>
    </tr>
  `
}

export function MatchMovedForwardEmail({
  companyName,
  roleTitle,
  engineerName,
  overallScore,
  dimensionScores,
  highlightQuote,
}: MatchMovedForwardEmailProps) {
  const safeCompany = escapeHtml(companyName)
  const safeRole = escapeHtml(roleTitle)
  const safeEngineer = escapeHtml(engineerName)
  const safeQuote = highlightQuote ? escapeHtml(highlightQuote) : null

  const scoreRows = [
    scoreBar('Mission', dimensionScores.mission),
    scoreBar('Technical', dimensionScores.technical),
    scoreBar('Culture', dimensionScores.culture),
    scoreBar('Environment', dimensionScores.environment),
    scoreBar('DNA', dimensionScores.dna),
  ].join('')

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
    .footer { padding: 16px 24px; border-top: 1px solid #D0D0D0; font-size: 11px; color: #5A5A5A; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title-bar">Match Decision: Move Forward</div>
    <div class="content">
      <h1>${safeCompany} wants to move forward</h1>
      <p>${safeCompany} selected <strong>${safeEngineer}</strong> for <strong>${safeRole}</strong>.</p>
      <div class="score-badge">${overallScore}% match</div>
      ${safeQuote ? `<div class="quote">"${safeQuote}"</div>` : ''}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${scoreRows}
      </table>
    </div>
    <div class="footer">
      Fractal Tech &middot; fractaltech.nyc
    </div>
  </div>
</body>
</html>
  `.trim()
}
