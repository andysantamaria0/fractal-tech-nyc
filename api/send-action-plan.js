const { Resend } = require('resend');

/**
 * Vercel serverless function to send Engineering Action Plan PDF via email
 * Uses Resend API for reliable email delivery
 */
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    // Parse and validate request body
    const { firstName, lastName, email } = req.body;

    // Validate required fields
    if (!firstName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName and email are required.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format.'
      });
    }

    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email with Action Plan
    const emailResult = await resend.emails.send({
      from: 'Fractal Team <hello@fractalbootcamp.com>',
      to: email,
      subject: "Fractal's Engineering Action Plan",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #2C2C2C;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: #E8E8E8;
              padding: 20px;
              border: 2px solid #2C2C2C;
              margin-bottom: 20px;
            }
            .content {
              background: #FFFFFF;
              padding: 30px;
              border: 2px solid #2C2C2C;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 10px 0;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            p {
              margin: 0 0 15px 0;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              background: #2C2C2C;
              color: #FFFFFF;
              padding: 12px 24px;
              text-decoration: none;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.05em;
              border: 2px solid #2C2C2C;
              box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.2);
              margin: 10px 0;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #5A5A5A;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>◾ FRACTAL</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>

            <p>Here is our no-nonsense plan to level up your engineering skills.</p>

            <p>Feel free to reach out to us anytime if you have questions.</p>

            <a href="https://fractalbootcamp.com/roadmap.html" class="button">VIEW ACTION PLAN →</a>

            <p style="margin-top: 20px;">Best,<br><strong>Fractal Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2025 Fractal Accelerator • NYC</p>
            <p>Questions? Reply to this email or visit <a href="https://fractalbootcamp.com">fractalbootcamp.com</a></p>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${firstName},

Here is our no-nonsense plan to level up your engineering skills.

Feel free to reach out to us anytime if you have questions.

View the Action Plan: https://fractalbootcamp.com/roadmap.html

Best,
Fractal Team

---
© 2025 Fractal Accelerator • NYC
Questions? Reply to this email or visit fractalbootcamp.com`
    });

    console.log('Email sent successfully:', emailResult);

    // Return success response
    return res.status(200).json({
      success: true,
      emailId: emailResult.id,
      message: 'Engineering Action Plan sent successfully!'
    });

  } catch (error) {
    console.error('Error sending action plan email:', error);

    // Return error response
    return res.status(500).json({
      success: false,
      error: 'Failed to send email. Please try again or contact us directly.'
    });
  }
};
