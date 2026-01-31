export interface GitHubEvent {
  id: string
  type: string
  actor: {
    login: string
    display_login: string
    avatar_url: string
  }
  repo: {
    name: string
    url: string
  }
  payload: Record<string, unknown>
  created_at: string
}

export interface FeedItem {
  id: string
  actor: string
  actorAvatar: string
  action: string
  repo: string
  repoUrl: string
  description: string
  url: string
  timestamp: string
  type: 'push' | 'pr' | 'review' | 'comment' | 'other'
}

const RELEVANT_EVENT_TYPES = [
  'PushEvent',
  'PullRequestEvent',
  'PullRequestReviewCommentEvent',
  'IssueCommentEvent',
]

export async function fetchOrgEvents(
  org: string,
  token: string,
  perPage = 50
): Promise<FeedItem[]> {
  const response = await fetch(
    `https://api.github.com/orgs/${org}/events?per_page=${perPage}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    }
  )

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }

  const events: GitHubEvent[] = await response.json()

  return events
    .filter((event) => RELEVANT_EVENT_TYPES.includes(event.type))
    .map(mapEventToFeedItem)
    .slice(0, 20)
}

export async function fetchUserEvents(
  username: string,
  token: string,
  perPage = 30
): Promise<FeedItem[]> {
  const response = await fetch(
    `https://api.github.com/users/${username}/events/public?per_page=${perPage}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: 300 },
    }
  )

  if (!response.ok) {
    // Don't throw — one engineer's missing/bad username shouldn't break the feed
    console.error(`GitHub user events error for ${username}: ${response.status}`)
    return []
  }

  const events: GitHubEvent[] = await response.json()

  return events
    .filter((event) => RELEVANT_EVENT_TYPES.includes(event.type))
    .map(mapEventToFeedItem)
}

export function mergeAndDedup(feeds: FeedItem[][], limit = 30): FeedItem[] {
  const all = feeds.flat()
  const seen = new Set<string>()
  const deduped: FeedItem[] = []

  // Sort newest first
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  for (const item of all) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      deduped.push(item)
    }
    if (deduped.length >= limit) break
  }

  return deduped
}

function mapEventToFeedItem(event: GitHubEvent): FeedItem {
  const repoShortName = event.repo.name.split('/').pop() || event.repo.name
  const repoUrl = `https://github.com/${event.repo.name}`
  const base: Omit<FeedItem, 'action' | 'description' | 'url' | 'type'> = {
    id: event.id,
    actor: event.actor.display_login || event.actor.login,
    actorAvatar: event.actor.avatar_url,
    repo: repoShortName,
    repoUrl,
    timestamp: event.created_at,
  }

  const payload = event.payload as Record<string, unknown>

  switch (event.type) {
    case 'PushEvent': {
      const commits = (payload.commits as Array<{ message: string }>) || []
      const commitCount = commits.length
      const message = commits[0]?.message?.split('\n')[0] || 'pushed code'
      return {
        ...base,
        type: 'push',
        action: `pushed ${commitCount} commit${commitCount !== 1 ? 's' : ''} to`,
        description: message,
        url: `${repoUrl}/commits/${((payload.ref as string) || 'refs/heads/main').replace('refs/heads/', '')}`,
      }
    }

    case 'PullRequestEvent': {
      const pr = payload.pull_request as {
        title: string
        number: number
        html_url: string
      }
      const prAction = payload.action as string
      return {
        ...base,
        type: 'pr',
        action: `${prAction} PR #${pr.number} in`,
        description: pr.title,
        url: pr.html_url,
      }
    }

    case 'PullRequestReviewCommentEvent': {
      const prComment = payload.pull_request as {
        number: number
      }
      const comment = payload.comment as { html_url: string; body: string }
      return {
        ...base,
        type: 'review',
        action: `reviewed PR #${prComment.number} in`,
        description:
          comment.body.length > 80
            ? comment.body.slice(0, 80) + '...'
            : comment.body,
        url: comment.html_url,
      }
    }

    case 'IssueCommentEvent': {
      const issue = payload.issue as {
        number: number
        title: string
      }
      const issueComment = payload.comment as { html_url: string }
      return {
        ...base,
        type: 'comment',
        action: `commented on #${issue.number} in`,
        description: issue.title,
        url: issueComment.html_url,
      }
    }

    default:
      return {
        ...base,
        type: 'other',
        action: `performed action in`,
        description: event.type,
        url: repoUrl,
      }
  }
}
