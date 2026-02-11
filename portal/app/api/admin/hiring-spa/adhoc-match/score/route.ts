import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-helpers'
import { computeAdHocMatches } from '@/lib/hiring-spa/adhoc-matching'

export const maxDuration = 120

export async function POST(request: Request) {
  return withAdmin(async ({ serviceClient, userId }) => {
    const { jd_url, engineer_ids, notes, extracted_jd } = await request.json()

    if (!jd_url || typeof jd_url !== 'string') {
      return NextResponse.json({ error: 'jd_url is required' }, { status: 400 })
    }

    try {
      new URL(jd_url)
    } catch {
      return NextResponse.json({ error: 'Invalid jd_url' }, { status: 400 })
    }

    if (!Array.isArray(engineer_ids) || engineer_ids.length === 0) {
      return NextResponse.json({ error: 'engineer_ids must be a non-empty array' }, { status: 400 })
    }

    // Use pre-extracted JD from the extract step if provided, avoiding redundant re-extraction
    const preExtractedJD = extracted_jd && typeof extracted_jd.title === 'string' && typeof extracted_jd.raw_text === 'string'
      ? { title: extracted_jd.title, sections: extracted_jd.sections || [], raw_text: extracted_jd.raw_text, source_platform: extracted_jd.source_platform }
      : undefined

    try {
      const matches = await computeAdHocMatches(jd_url, engineer_ids, userId, serviceClient, preExtractedJD)

      if (notes && typeof notes === 'string') {
        const ids = matches.map((m) => m.id)
        const { error: notesError } = await serviceClient
          .from('adhoc_matches')
          .update({ notes })
          .in('id', ids)
        if (notesError) {
          console.error('[adhoc-match] Failed to apply notes:', notesError)
        }
      }

      return NextResponse.json({ matches })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[adhoc-match] Scoring failed:', msg)
      return NextResponse.json({ error: `Scoring failed: ${msg}` }, { status: 500 })
    }
  })
}
