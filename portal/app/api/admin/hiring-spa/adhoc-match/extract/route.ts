import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { extractFromUrl } from '@/lib/hiring-spa/jd-extract'

export async function POST(request: Request) {
  return withAdmin(async () => {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    try {
      const extracted = await extractFromUrl(url)
      return NextResponse.json({
        title: extracted.title,
        sections: extracted.sections,
        raw_text: extracted.raw_text,
        source_platform: extracted.source_platform,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Extraction failed'
      return NextResponse.json({ error: msg }, { status: 422 })
    }
  })
}
