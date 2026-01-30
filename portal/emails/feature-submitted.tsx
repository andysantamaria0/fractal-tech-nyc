interface FeatureSubmittedEmailProps {
  name: string
  featureTitle: string
  timeline: string
}

export function FeatureSubmittedEmail({ name, featureTitle, timeline }: FeatureSubmittedEmailProps) {
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
    .detail { background: #E8E8E8; border: 2px solid #2C2C2C; padding: 12px 16px; font-size: 14px; font-weight: 700; margin-bottom: 16px; }
    .footer { padding: 16px 24px; border-top: 1px solid #D0D0D0; font-size: 11px; color: #5A5A5A; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title-bar">Feature Request Received</div>
    <div class="content">
      <h1>Got it, ${name}!</h1>
      <p>Your feature request has been submitted and our team will review it shortly.</p>
      <div class="detail">${featureTitle}</div>
      <div class="detail">Timeline: ${timeline.replace('-', ' ')}</div>
      <p>We'll match you with an engineer and follow up with next steps. You can track your submissions in the portal.</p>
    </div>
    <div class="footer">
      Fractal Bootcamp &middot; fractaltech.nyc
    </div>
  </div>
</body>
</html>
  `.trim()
}
