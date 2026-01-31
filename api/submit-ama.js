const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { name, email, twitter, phone, context, question, tag_preference } = req.body;

    if (!name || !email || !twitter || !phone || !context || !question || !tag_preference) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Length validation
    if (name.length > 200 || email.length > 200 || twitter.length > 200 || phone.length > 50) {
      return res.status(400).json({ success: false, error: 'Field too long' });
    }
    if (context.length > 5000 || question.length > 5000) {
      return res.status(400).json({ success: false, error: 'Text too long (5000 char max)' });
    }
    if (!['tag-me', 'keep-anon'].includes(tag_preference)) {
      return res.status(400).json({ success: false, error: 'Invalid tag preference' });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error: insertError } = await supabase
      .from('ama_submissions')
      .insert({ name, email, twitter, phone, context, question, tag_preference });

    if (insertError) {
      console.error('AMA insert error:', insertError);
      return res.status(500).json({ success: false, error: 'Failed to submit question' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('AMA submission error:', error);
    return res.status(500).json({ success: false, error: 'Something went wrong' });
  }
};
