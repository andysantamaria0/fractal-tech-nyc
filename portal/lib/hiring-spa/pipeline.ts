import { createServiceClient } from '@/lib/supabase/server'
import { discoverUrls } from './discover'
import { crawlUrls } from './crawl'
import { analyzeGitHubOrg } from './github-analysis'
import { synthesizeCrawlData } from './synthesize'
import { discoverRoles } from './role-discovery'
import type { CrawlData } from './types'

/**
 * Run the full crawl pipeline for a company.
 * This is designed to run in the background via Next.js after().
 *
 * Flow: discover URLs → crawl pages → analyze GitHub → synthesize with LLM → save results
 */
export async function runCrawlPipeline(
  companyId: string,
  websiteUrl: string,
  githubOrg: string | null,
  linkedinUrl: string | null,
): Promise<void> {
  const serviceClient = await createServiceClient()

  try {
    // 1. Discover URLs to crawl
    console.log(`[hiring-spa] Discovering URLs for ${websiteUrl}`)
    const { urls } = await discoverUrls(websiteUrl)
    console.log(`[hiring-spa] Found ${urls.length} URLs to crawl`)

    // 2. Crawl discovered pages
    console.log(`[hiring-spa] Crawling ${urls.length} pages`)
    const crawledPages = await crawlUrls(urls)
    console.log(`[hiring-spa] Successfully crawled ${crawledPages.length} pages`)

    // 3. Analyze GitHub org (if provided)
    let githubData = null
    if (githubOrg) {
      console.log(`[hiring-spa] Analyzing GitHub org: ${githubOrg}`)
      githubData = await analyzeGitHubOrg(githubOrg)
      if (githubData) {
        console.log(`[hiring-spa] GitHub analysis complete: ${githubData.publicRepos} repos`)
      } else {
        console.log(`[hiring-spa] GitHub analysis returned no data`)
      }
    }

    // 4. Build crawl data
    const crawlData: CrawlData = {
      website: crawledPages,
      github: githubData ?? undefined,
      linkedinUrl: linkedinUrl ?? undefined,
    }

    // 5. Synthesize with LLM
    console.log(`[hiring-spa] Starting LLM synthesis`)
    const synthesis = await synthesizeCrawlData(crawlData)
    console.log(`[hiring-spa] Synthesis complete (confidence: ${synthesis.confidence})`)

    // 6. Discover roles from careers/jobs pages
    console.log(`[hiring-spa] Discovering roles from careers pages`)
    let discoveredRoles = null
    try {
      const roles = await discoverRoles(websiteUrl, crawledPages)
      if (roles.length > 0) {
        discoveredRoles = roles
        console.log(`[hiring-spa] Found ${roles.length} potential engineering roles`)
      } else {
        console.log(`[hiring-spa] No engineering roles found on careers pages`)
      }
    } catch (err) {
      // Role discovery failure is non-fatal — continue without roles
      console.warn(`[hiring-spa] Role discovery failed:`, err instanceof Error ? err.message : err)
    }

    // 7. Save results — set status based on whether roles were found
    const nextStatus = discoveredRoles ? 'discovering_roles' : 'questionnaire'

    const { error: saveError } = await serviceClient
      .from('hiring_profiles')
      .update({
        crawl_data: crawlData,
        crawl_error: null,
        crawl_completed_at: new Date().toISOString(),
        company_dna: synthesis.companyDna,
        technical_environment: synthesis.technicalEnvironment,
        discovered_roles: discoveredRoles,
        status: nextStatus,
      })
      .eq('company_id', companyId)

    if (saveError) {
      throw new Error(`Failed to save results: ${saveError.message}`)
    }

    console.log(`[hiring-spa] Pipeline complete for company ${companyId} (status: ${nextStatus})`)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown pipeline error'
    console.error(`[hiring-spa] Pipeline failed for company ${companyId}:`, errorMessage)

    // Save error state
    await serviceClient
      .from('hiring_profiles')
      .update({
        status: 'draft',
        crawl_error: errorMessage,
      })
      .eq('company_id', companyId)
  }
}
