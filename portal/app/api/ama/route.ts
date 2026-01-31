import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, twitter, phone, context, question, tag_preference } = body

    if (!name || !email || !twitter || !phone || !context || !question || !tag_preference) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Length validation
    if (name.length > 200) {
      return NextResponse.json({ error: 'Name must be 200 characters or less' }, { status: 400 })
    }
    if (email.length > 200) {
      return NextResponse.json({ error: 'Email must be 200 characters or less' }, { status: 400 })
    }
    if (twitter.length > 200) {
      return NextResponse.json({ error: 'Twitter handle must be 200 characters or less' }, { status: 400 })
    }
    if (phone.length > 50) {
      return NextResponse.json({ error: 'Phone number must be 50 characters or less' }, { status: 400 })
    }
    if (context.length > 5000) {
      return NextResponse.json({ error: 'Context must be 5000 characters or less' }, { status: 400 })
    }
    if (question.length > 5000) {
      return NextResponse.json({ error: 'Question must be 5000 characters or less' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { error: insertError } = await supabase
      .from('ama_submissions')
      .insert({
        name,
        email,
        twitter,
        phone,
        context,
        question,
        tag_preference,
      })

    if (insertError) {
      console.error('AMA insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit question' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('AMA submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit question' },
      { status: 500 }
    )
  }
}
