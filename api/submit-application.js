const hubspot = require('@hubspot/api-client');

/**
 * Vercel serverless function to submit Fractal Bootcamp applications to HubSpot
 * Creates/updates a contact and creates a deal in the Bootcamp Pipeline
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
    const { fullName, email, phone, linkedin } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fullName, email, and phone are required.'
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

    // Parse full name into first and last name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Prepare contact properties
    const contactProperties = {
      email: email,
      firstname: firstName,
      lastname: lastName,
      phone: phone
    };

    // Add LinkedIn if provided
    if (linkedin) {
      contactProperties.linkedin_profile = linkedin;
    }

    // Step 1: Search for existing contact by email
    let contactId;
    try {
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
      console.error('Error creating/updating contact:', contactError);
      throw new Error('Failed to create or update contact in HubSpot');
    }

    // Step 2: Create deal associated with contact
    const dealName = `Application - ${fullName}`;

    // Use environment variables for pipeline and stage, with fallbacks
    const pipelineId = process.env.HUBSPOT_PIPELINE_ID || 'default';
    const stageId = process.env.HUBSPOT_STAGE_ID || 'appointmentscheduled';

    try {
      const dealResponse = await hubspotClient.crm.deals.basicApi.create({
        properties: {
          dealname: dealName,
          pipeline: pipelineId,
          dealstage: stageId,
          amount: '0',
          // Store additional application data as custom properties if needed
          application_date: new Date().toISOString()
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

      const dealId = dealResponse.id;
      console.log(`Created deal: ${dealId} for contact: ${contactId}`);

      // Return success response
      return res.status(200).json({
        success: true,
        contactId: contactId,
        dealId: dealId,
        message: 'Application submitted successfully!'
      });

    } catch (dealError) {
      console.error('Error creating deal:', dealError);

      // Even if deal creation fails, contact was created/updated
      // Return partial success
      return res.status(200).json({
        success: true,
        contactId: contactId,
        dealId: null,
        warning: 'Contact created but deal creation failed. Our team will follow up with you.'
      });
    }

  } catch (error) {
    console.error('Unexpected error in submit-application:', error);

    // Return generic error to client (don't expose internal details)
    return res.status(500).json({
      success: false,
      error: 'An error occurred while submitting your application. Please try again or contact us directly.'
    });
  }
};
