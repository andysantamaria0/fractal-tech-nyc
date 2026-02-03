import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1024

const SYSTEM_PROMPT = `You are evaluating a technical challenge submission for a hiring process. You will be given the challenge prompt and the candidate's response (text and/or link). Score the submission 0-100 and provide brief reasoning.

You MUST respond with valid JSON matching this exact structure:
{
  "score": <0-100>,
  "reasoning": "2-4 sentence evaluation"
}

Guidelines:
- 80+ = Excellent: thorough, well-structured, demonstrates strong understanding
- 60-79 = Good: solid effort with some gaps or areas for improvement
- 40-59 = Adequate: meets basic requirements but lacks depth
- Below 40 = Insufficient: incomplete, off-topic, or low quality
- You can only evaluate text and links. If the candidate submitted a file upload, note that you cannot evaluate it and score based on available content only.
- Be fair but calibrated — don't inflate scores`

interface GradeResult {
  score: number
  reasoning: string
}

export async function gradeSubmission(
  challengePrompt: string,
  textResponse: string | null,
  linkUrl: string | null,
): Promise<GradeResult> {
  const anthropic = new Anthropic()

  const parts: string[] = []
  parts.push(`CHALLENGE PROMPT:\n${challengePrompt}`)

  if (textResponse) {
    parts.push(`TEXT RESPONSE:\n${textResponse}`)
  }
  if (linkUrl) {
    parts.push(`LINK PROVIDED:\n${linkUrl}`)
  }
  if (!textResponse && !linkUrl) {
    parts.push('NOTE: The candidate only submitted a file upload, which cannot be evaluated here. Score based on effort shown.')
  }

  const userPrompt = parts.join('\n\n')

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse grading response as JSON')
  }

  const parsed = JSON.parse(jsonMatch[0]) as GradeResult
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    reasoning: parsed.reasoning,
  }
}

export async function runAutoGrade(
  submissionId: string,
  serviceClient: SupabaseClient,
): Promise<void> {
  // Fetch submission + match + role
  const { data: submission, error: subError } = await serviceClient
    .from('challenge_submissions')
    .select('id, match_id, text_response, link_url')
    .eq('id', submissionId)
    .single()

  if (subError || !submission) {
    console.error('Failed to fetch submission for grading:', subError)
    return
  }

  const { data: match, error: matchError } = await serviceClient
    .from('hiring_spa_matches')
    .select('role_id')
    .eq('id', submission.match_id)
    .single()

  if (matchError || !match) {
    console.error('Failed to fetch match for grading:', matchError)
    return
  }

  const { data: role, error: roleError } = await serviceClient
    .from('hiring_roles')
    .select('challenge_prompt')
    .eq('id', match.role_id)
    .single()

  if (roleError || !role || !role.challenge_prompt) {
    console.error('Failed to fetch role challenge prompt:', roleError)
    return
  }

  try {
    const result = await gradeSubmission(
      role.challenge_prompt,
      submission.text_response,
      submission.link_url,
    )

    await serviceClient
      .from('challenge_submissions')
      .update({
        auto_score: result.score,
        auto_reasoning: result.reasoning,
        auto_graded_at: new Date().toISOString(),
        final_score: result.score, // auto_score is final until human review
      })
      .eq('id', submissionId)
  } catch (error) {
    console.error('Auto-grading failed:', error)
  }
}
