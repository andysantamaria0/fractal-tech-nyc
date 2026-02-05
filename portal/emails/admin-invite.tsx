import { escapeHtml } from '@/lib/sanitize'

interface AdminInviteEmailProps {
  name: string
  inviteLink: string
}

export function AdminInviteEmail({ name, inviteLink }: AdminInviteEmailProps) {
  const safeName = escapeHtml(name)
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
    .cta { display: inline-block; background: #FFFFFF; color: #C7547C; border: 3px solid #C7547C; padding: 16px 32px; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none; box-shadow: 4px 4px 0 #C7547C; }
    .footer { padding: 16px 24px; border-top: 1px solid #D0D0D0; font-size: 11px; color: #5A5A5A; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title-bar">Fractal Partners — Admin Invite</div>
    <div class="content">
      <h1>Hey ${safeName},</h1>
      <p>You've been granted <strong>admin access</strong> to the Fractal Partners Portal.</p>
      <p>Click the button below to accept your invitation and set up your account. Once you're in, you'll have full access to manage engineers, companies, content, and more.</p>
      <p style="text-align: center; margin-top: 32px;">
        <a href="${inviteLink}" class="cta">Accept Invite</a>
      </p>
    </div>
    <div class="footer">
      Fractal Tech &middot; fractaltech.nyc
    </div>
  </div>
</body>
</html>
  `.trim()
}
