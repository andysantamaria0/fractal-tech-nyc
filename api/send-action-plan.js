const { Resend } = require('resend');
const hubspot = require('@hubspot/api-client');
const fs = require('fs');
const path = require('path');

/**
 * Vercel serverless function to send Engineering Action Plan PDF via email
 * Also creates HubSpot contact, deal, and adds to list
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

    // Initialize HubSpot client
    const hubspotClient = new hubspot.Client({
      accessToken: process.env.HUBSPOT_API_KEY
    });

    // Step 1: Create/Update Contact in HubSpot
    let contactId;
    try {
      // Search for existing contact by email
      const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }],
        limit: 1
      });

      const contactProperties = {
        email: email,
        firstname: firstName,
        lastname: lastName || ''
      };

      if (searchResponse.results && searchResponse.results.length > 0) {
        // Contact exists - update it
        contactId = searchResponse.results[0].id;
        await hubspotClient.crm.contacts.basicApi.update(contactId, {
          properties: contactProperties
        });
        console.log(`Updated existing contact: ${contactId}`);
      } else {
        // Contact doesn't exist - create new
        const contactResponse = await hubspotClient.crm.contacts.basicApi.create({
          properties: contactProperties
        });
        contactId = contactResponse.id;
        console.log(`Created new contact: ${contactId}`);
      }
    } catch (contactError) {
      console.error('Error creating/updating contact in HubSpot:', contactError);
      // Continue with email even if HubSpot fails
    }

    // Step 2: Create Deal in Pipeline
    if (contactId) {
      try {
        const dealName = `Action Plan Download - ${firstName} ${lastName || ''}`.trim();
        const pipelineId = process.env.HUBSPOT_PIPELINE_ID || 'default';
        const stageId = process.env.HUBSPOT_STAGE_ID || 'appointmentscheduled';

        await hubspotClient.crm.deals.basicApi.create({
          properties: {
            dealname: dealName,
            pipeline: pipelineId,
            dealstage: stageId,
            amount: '0'
          },
          associations: [
            {
              to: { id: contactId },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 3 // Contact to Deal association
                }
              ]
            }
          ]
        });
        console.log(`Created deal for contact: ${contactId}`);
      } catch (dealError) {
        console.error('Error creating deal in HubSpot:', dealError);
        // Continue with email even if deal creation fails
      }
    }

    // Step 3: Add Contact to List (if list ID is configured)
    if (contactId && process.env.HUBSPOT_ACTION_PLAN_LIST_ID) {
      try {
        // Use the v3 API to add contact to list
        await hubspotClient.apiRequest({
          method: 'PUT',
          path: `/contacts/v1/lists/${process.env.HUBSPOT_ACTION_PLAN_LIST_ID}/add`,
          body: {
            emails: [email]
          }
        });
        console.log(`Added contact ${email} to list ${process.env.HUBSPOT_ACTION_PLAN_LIST_ID}`);
      } catch (listError) {
        console.error('Error adding contact to HubSpot list:', listError);
        console.error('List error details:', listError.response?.data || listError.message);
        // Continue with email even if list addition fails
      }
    }

    // Step 4: Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Read the PDF file
    const pdfPath = path.join(process.cwd(), 'public', 'action-plan.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Step 5: Send email with Action Plan PDF attached
    const emailResult = await resend.emails.send({
      from: 'Fractal Team <onboarding@resend.dev>',
      to: email,
      subject: "Fractal's Engineering Action Plan",
      attachments: [
        {
          filename: 'Your-Software-Engineering-Action-Plan.pdf',
          content: pdfBase64,
        }
      ],
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

            <p><strong>Your Software Engineering Action Plan is attached to this email.</strong></p>

            <p>Feel free to reach out to us anytime if you have questions.</p>

            <p style="margin-top: 20px;">Best,<br><strong>Fractal Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2026 Fractal Accelerator • NYC</p>
            <p>Questions? Reply to this email or visit <a href="https://fractaltech.nyc">fractaltech.nyc</a></p>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${firstName},

Here is our no-nonsense plan to level up your engineering skills.

Your Software Engineering Action Plan is attached to this email.

Feel free to reach out to us anytime if you have questions.

Best,
Fractal Team

---
© 2026 Fractal Accelerator • NYC
Questions? Reply to this email or visit fractaltech.nyc`
    });

    console.log('Email sent successfully:', emailResult);

    // Return success response
    return res.status(200).json({
      success: true,
      emailId: emailResult.id,
      contactId: contactId,
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
