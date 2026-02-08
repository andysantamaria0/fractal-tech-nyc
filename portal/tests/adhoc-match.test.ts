/**
 * Ad-Hoc JD Match — Production Integration Tests
 *
 * Tests the full stack: DB schema, JD extraction, Claude scoring,
 * and Supabase CRUD against the live production environment.
 *
 * Run: npx tsx tests/adhoc-match.test.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { extractFromUrl } from '../lib/hiring-spa/jd-extract'
import { scoreEngineerForJD, computeAdHocMatches } from '../lib/hiring-spa/adhoc-matching'
import type { EngineerProfileSpa, ExtractedJD } from '../lib/hiring-spa/types'

// ── Load .env.local ──────────────────────────────────────
const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = dirname(__filename2)

function loadEnv() {
  const envPath = resolve(__dirname2, '..', '.env.local')
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    let val = trimmed.slice(eqIdx + 1)
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Test harness ─────────────────────────────────────────
let passed = 0
let failed = 0
const failures: { name: string; msg: string }[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  \u2713 ${name}`)
  } catch (err) {
    failed++
    const msg = err instanceof Error ? err.message : String(err)
    failures.push({ name, msg })
    console.log(`  \u2717 ${name}`)
    console.log(`    \u2192 ${msg}`)
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

// ── Cleanup helpers ──────────────────────────────────────
const testMatchIds: string[] = []

async function cleanup() {
  if (testMatchIds.length > 0) {
    const { error } = await supabase.from('adhoc_matches').delete().in('id', testMatchIds)
    if (error) console.log(`  Cleanup warning: ${error.message}`)
    else console.log(`\n  Cleaned up ${testMatchIds.length} test row(s)`)
  }
}

// ══════════════════════════════════════════════════════════

async function main() {
  let testEngineerId = ''

  // ── Phase 1: Database Schema ───────────────────────────
  console.log('\n--- Phase 1: Database Schema ---\n')

  await test('adhoc_matches table exists and is queryable', async () => {
    const { data, error } = await supabase.from('adhoc_matches').select('id').limit(1)
    assert(!error, `Query failed: ${error?.message}`)
    assert(Array.isArray(data), 'Expected array result')
  })

  await test('can insert a test row with all fields', async () => {
    const { data: engineers } = await supabase.from('engineers').select('id').eq('status', 'complete').limit(1)
    assert(engineers && engineers.length > 0, 'Need at least one complete engineer in DB')
    testEngineerId = engineers[0].id

    const testRow = {
      jd_url: 'https://test.example.com/job/adhoc-test-12345',
      jd_title: 'Test Senior Engineer',
      jd_raw_text: 'This is test raw text for the JD...',
      jd_sections: [{ heading: 'Overview', content: 'Test content' }],
      source_platform: 'test',
      engineer_id: testEngineerId,
      admin_user_id: null,
      overall_score: 72,
      dimension_scores: { mission: 80, technical: 70, culture: 65, environment: 75, dna: 70 },
      reasoning: {
        mission: 'Good alignment on mission',
        technical: 'Strong technical match',
        culture: 'Moderate culture fit',
        environment: 'Good environment match',
        dna: 'Career stage aligns well',
      },
      highlight_quote: 'A strong overall match with particular alignment on mission.',
      notes: 'Test run - will be cleaned up',
    }

    const { data, error } = await supabase.from('adhoc_matches').insert(testRow).select().single()
    assert(!error, `Insert failed: ${error?.message}`)
    assert(data.id, 'Expected an id')
    testMatchIds.push(data.id)

    assertEqual(data.jd_url, testRow.jd_url, 'jd_url')
    assertEqual(data.jd_title, testRow.jd_title, 'jd_title')
    assertEqual(data.overall_score, testRow.overall_score, 'overall_score')
    assertEqual(data.source_platform, testRow.source_platform, 'source_platform')
    assertEqual(data.highlight_quote, testRow.highlight_quote, 'highlight_quote')
    assertEqual(data.notes, testRow.notes, 'notes')
    assert(data.dimension_scores.mission === 80, 'dimension_scores.mission should be 80')
    assert(data.reasoning.technical === 'Strong technical match', 'reasoning.technical mismatch')
    assert(data.created_at, 'Expected created_at')
    assert(data.updated_at, 'Expected updated_at')
  })

  await test('overall_score CHECK rejects score > 100', async () => {
    const { error } = await supabase.from('adhoc_matches').insert({
      jd_url: 'https://test.example.com/invalid-score',
      jd_title: 'Test',
      engineer_id: testEngineerId,
      overall_score: 150,
      dimension_scores: { mission: 50, technical: 50, culture: 50, environment: 50, dna: 50 },
      reasoning: { mission: 'x', technical: 'x', culture: 'x', environment: 'x', dna: 'x' },
    })
    assert(error, 'Expected insert to fail with score > 100')
  })

  await test('overall_score CHECK rejects score < 0', async () => {
    const { error } = await supabase.from('adhoc_matches').insert({
      jd_url: 'https://test.example.com/invalid-score-neg',
      jd_title: 'Test',
      engineer_id: testEngineerId,
      overall_score: -5,
      dimension_scores: { mission: 50, technical: 50, culture: 50, environment: 50, dna: 50 },
      reasoning: { mission: 'x', technical: 'x', culture: 'x', environment: 'x', dna: 'x' },
    })
    assert(error, 'Expected insert to fail with score < 0')
  })

  await test('FK constraint rejects non-existent engineer_id', async () => {
    const { error } = await supabase.from('adhoc_matches').insert({
      jd_url: 'https://test.example.com/bad-fk',
      jd_title: 'Test',
      engineer_id: '00000000-0000-0000-0000-000000000000',
      overall_score: 50,
      dimension_scores: { mission: 50, technical: 50, culture: 50, environment: 50, dna: 50 },
      reasoning: { mission: 'x', technical: 'x', culture: 'x', environment: 'x', dna: 'x' },
    })
    assert(error, 'Expected FK violation')
  })

  await test('updated_at trigger advances on UPDATE', async () => {
    assert(testMatchIds.length > 0, 'Need a test row')
    const id = testMatchIds[0]

    const { data: before } = await supabase.from('adhoc_matches').select('updated_at').eq('id', id).single()
    assert(before, 'Could not read test row')

    await new Promise((r) => setTimeout(r, 1100))
    const { error } = await supabase.from('adhoc_matches').update({ notes: 'updated notes test' }).eq('id', id)
    assert(!error, `Update failed: ${error?.message}`)

    const { data: after } = await supabase.from('adhoc_matches').select('updated_at').eq('id', id).single()
    assert(after, 'Could not re-read test row')
    assert(after.updated_at > before.updated_at,
      `updated_at did not advance: before=${before.updated_at} after=${after.updated_at}`)
  })

  await test('history join pattern works', async () => {
    const { data, error } = await supabase
      .from('adhoc_matches')
      .select('*, engineer:engineers(id, name, email)')
      .order('created_at', { ascending: false })
      .limit(5)

    assert(!error, `Join query failed: ${error?.message}`)
    assert(Array.isArray(data), 'Expected array')
    if (data.length > 0) {
      assert(data[0].engineer, 'Missing joined engineer data')
      assert(data[0].engineer.name, 'Missing engineer.name in join')
      assert(data[0].engineer.email, 'Missing engineer.email in join')
    }
  })

  // ── Phase 2: JD Extraction ─────────────────────────────
  console.log('\n--- Phase 2: JD Extraction ---\n')

  await test('extractFromUrl: Greenhouse job page', async () => {
    const result = await extractFromUrl('https://boards.greenhouse.io/anthropic/jobs/4020028008')
    assert(result.title, 'Expected a title')
    assert(result.raw_text.length > 10, `Raw text too short: ${result.raw_text.length} chars`)
    assertEqual(result.source_platform, 'greenhouse', 'source_platform')
    console.log(`    "${result.title.slice(0, 60)}..." (${result.raw_text.length} chars, ${result.sections.length} sections)`)
  })

  await test('extractFromUrl: rejects 404', async () => {
    try {
      await extractFromUrl('https://boards.greenhouse.io/nonexistent-xyz/jobs/9999999999')
      throw new Error('Should have thrown')
    } catch (e: unknown) {
      const msg = (e as Error).message
      assert(!msg.includes('Should have thrown'), `Expected HTTP error, got: ${msg}`)
    }
  })

  await test('extractFromUrl: sections have heading + content', async () => {
    const result = await extractFromUrl('https://boards.greenhouse.io/anthropic/jobs/4020028008')
    for (const s of result.sections) {
      assert(typeof s.heading === 'string', 'heading should be string')
      assert(typeof s.content === 'string', 'content should be string')
      assert(s.content.length > 0, `section "${s.heading}" has empty content`)
    }
  })

  await test('extractFromUrl: raw_text capped at 10000', async () => {
    const result = await extractFromUrl('https://boards.greenhouse.io/anthropic/jobs/4020028008')
    assert(result.raw_text.length <= 10000, `raw_text ${result.raw_text.length} exceeds 10000`)
  })

  // ── Phase 3: Claude Scoring ────────────────────────────
  console.log('\n--- Phase 3: Claude Scoring ---\n')

  await test('scoreEngineerForJD: valid 5-dimension scores', async () => {
    const { data: engineers } = await supabase.from('engineers').select('*').eq('status', 'complete').limit(1)
    assert(engineers && engineers.length > 0, 'Need a complete engineer')

    const engineer = engineers[0] as EngineerProfileSpa
    const testJD: ExtractedJD = {
      title: 'Senior Full-Stack Engineer - Climate Tech Startup',
      sections: [
        { heading: 'Overview', content: 'Join our mission to fight climate change.' },
        { heading: 'Requirements', content: 'TypeScript, React, Node.js, PostgreSQL.' },
      ],
      raw_text: 'Senior Full-Stack Engineer - Climate Tech Startup\n\nJoin our mission to fight climate change.\n\nRequirements: TypeScript, React, Node.js, PostgreSQL, 5+ years, remote-first.',
      source_platform: 'test',
    }

    console.log(`    Scoring ${engineer.name} against "${testJD.title}"...`)
    const result = await scoreEngineerForJD(testJD, engineer)

    assert(result.scores, 'Missing scores')
    assert(result.reasoning, 'Missing reasoning')
    assert(typeof result.highlight_quote === 'string' && result.highlight_quote.length > 5, 'Missing/short highlight_quote')

    const dims = ['mission', 'technical', 'culture', 'environment', 'dna'] as const
    for (const dim of dims) {
      assert(typeof result.scores[dim] === 'number', `scores.${dim} not a number`)
      assert(result.scores[dim] >= 0 && result.scores[dim] <= 100, `scores.${dim} = ${result.scores[dim]} out of [0,100]`)
      assert(Number.isInteger(result.scores[dim]), `scores.${dim} = ${result.scores[dim]} not integer`)
      assert(typeof result.reasoning[dim] === 'string' && result.reasoning[dim].length > 5, `reasoning.${dim} too short`)
    }

    console.log(`    M:${result.scores.mission} T:${result.scores.technical} C:${result.scores.culture} E:${result.scores.environment} D:${result.scores.dna}`)
    console.log(`    "${result.highlight_quote.slice(0, 80)}..."`)
  })

  await test('scoreEngineerForJD: conservative scores for sparse JD', async () => {
    const { data: engineers } = await supabase.from('engineers').select('*').eq('status', 'complete').limit(1)
    const engineer = engineers![0] as EngineerProfileSpa

    const sparseJD: ExtractedJD = {
      title: 'Software Developer',
      sections: [],
      raw_text: 'Software Developer. Apply now.',
    }

    console.log(`    Scoring against sparse JD...`)
    const result = await scoreEngineerForJD(sparseJD, engineer)

    // With almost no JD info, scores should be conservative (roughly 45-55 range)
    // We'll verify they're at least in a reasonable range and not inflated
    const dims = ['mission', 'culture', 'environment'] as const
    for (const dim of dims) {
      assert(result.scores[dim] <= 75, `${dim} = ${result.scores[dim]} unexpectedly high for sparse JD`)
    }
    console.log(`    M:${result.scores.mission} T:${result.scores.technical} C:${result.scores.culture} E:${result.scores.environment} D:${result.scores.dna}`)
  })

  // ── Phase 4: Full Pipeline ─────────────────────────────
  console.log('\n--- Phase 4: Full Pipeline ---\n')

  await test('computeAdHocMatches: extract + score + persist', async () => {
    const { data: engineers } = await supabase.from('engineers').select('id, name').eq('status', 'complete').limit(1)
    assert(engineers && engineers.length > 0, 'Need a complete engineer')

    const jdUrl = 'https://boards.greenhouse.io/anthropic/jobs/4020028008'
    console.log(`    Full pipeline: ${engineers[0].name} vs Greenhouse JD...`)

    const matches = await computeAdHocMatches(jdUrl, [engineers[0].id], undefined, supabase)

    assert(Array.isArray(matches), 'Expected array')
    assertEqual(matches.length, 1, 'Match count')

    const m = matches[0]
    assert(m.id, 'Missing id')
    assertEqual(m.jd_url, jdUrl, 'jd_url')
    assert(m.jd_title, 'Missing jd_title')
    assert(m.jd_raw_text, 'Missing jd_raw_text')
    assert(m.jd_sections, 'Missing jd_sections')
    assertEqual(m.engineer_id, engineers[0].id, 'engineer_id')
    assert(m.overall_score >= 0 && m.overall_score <= 100, `overall_score ${m.overall_score} out of range`)

    // Verify overall = average of 5 dimensions
    const dims = ['mission', 'technical', 'culture', 'environment', 'dna'] as const
    const expectedOverall = Math.round(dims.reduce((s, d) => s + m.dimension_scores[d], 0) / 5)
    assertEqual(m.overall_score, expectedOverall, 'overall = avg(dimensions)')

    testMatchIds.push(m.id)

    // Verify persisted
    const { data: dbRow, error: dbErr } = await supabase.from('adhoc_matches').select('*').eq('id', m.id).single()
    assert(!dbErr, `DB verify failed: ${dbErr?.message}`)
    assertEqual(dbRow.overall_score, m.overall_score, 'DB overall_score')
    assertEqual(dbRow.jd_url, jdUrl, 'DB jd_url')

    console.log(`    overall=${m.overall_score} M:${m.dimension_scores.mission} T:${m.dimension_scores.technical} C:${m.dimension_scores.culture} E:${m.dimension_scores.environment} D:${m.dimension_scores.dna}`)
    console.log(`    "${m.jd_title}"`)
  })

  await test('computeAdHocMatches: bad URL throws', async () => {
    const { data: engineers } = await supabase.from('engineers').select('id').eq('status', 'complete').limit(1)
    try {
      await computeAdHocMatches('https://this-does-not-exist-xyz123.com/job', [engineers![0].id], undefined, supabase)
      throw new Error('Should have thrown')
    } catch (e: unknown) {
      const msg = (e as Error).message
      assert(!msg.includes('Should have thrown'), 'Expected extraction error')
      console.log(`    (correctly threw: "${msg.slice(0, 80)}")`)
    }
  })

  // ── Phase 5: History Queries ───────────────────────────
  console.log('\n--- Phase 5: History Queries ---\n')

  await test('history ordered by created_at DESC', async () => {
    const { data, error } = await supabase
      .from('adhoc_matches')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    assert(!error, `Query failed: ${error?.message}`)
    for (let i = 1; i < (data?.length ?? 0); i++) {
      assert(data![i - 1].created_at >= data![i].created_at, 'Not DESC ordered')
    }
    console.log(`    (${data?.length} rows, order verified)`)
  })

  await test('history grouping by jd_url works', async () => {
    const { data } = await supabase
      .from('adhoc_matches')
      .select('jd_url, jd_title, overall_score')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data || data.length === 0) {
      console.log('    (no history to group)')
      return
    }

    const groups: Record<string, number> = {}
    for (const m of data) {
      groups[m.jd_url] = (groups[m.jd_url] || 0) + 1
    }
    console.log(`    (${data.length} rows -> ${Object.keys(groups).length} JD groups)`)
    assert(Object.keys(groups).length > 0, 'Expected at least one group')
  })

  // ── Cleanup ────────────────────────────────────────────
  await cleanup()

  console.log('\n==============================')
  console.log(`  ${passed} passed, ${failed} failed`)
  console.log('==============================')

  if (failures.length > 0) {
    console.log('\nFailures:')
    for (const f of failures) {
      console.log(`  x ${f.name}`)
      console.log(`    ${f.msg}`)
    }
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Test runner crashed:', err)
  process.exit(1)
})
