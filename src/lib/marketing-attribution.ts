export interface MarketingAttribution {
  source: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
  landingPath?: string
  firstSeenAt?: string
}

const STORAGE_KEY = 'pu_marketing_attribution'

export function readAttributionFromSearch(
  search: string,
  pathname = '/'
): MarketingAttribution | null {
  const params = new URLSearchParams(search)
  const source = params.get('utm_source')

  if (!source) return null

  return {
    source,
    medium: params.get('utm_medium') ?? undefined,
    campaign: params.get('utm_campaign') ?? undefined,
    content: params.get('utm_content') ?? undefined,
    term: params.get('utm_term') ?? undefined,
    landingPath: pathname,
    firstSeenAt: new Date().toISOString(),
  }
}

export function persistAttribution(search: string, pathname = '/'): MarketingAttribution | null {
  if (typeof window === 'undefined') return null

  const attribution = readAttributionFromSearch(search, pathname)
  if (!attribution) return getStoredAttribution()

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    return attribution
  }

  return attribution
}

export function getStoredAttribution(): MarketingAttribution | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as MarketingAttribution
  } catch {
    return null
  }
}

export function getAttributionProperties() {
  const attribution = getStoredAttribution()

  return {
    source: attribution?.source ?? 'direct',
    medium: attribution?.medium ?? 'direct',
    campaign: attribution?.campaign ?? 'none',
    content: attribution?.content ?? 'none',
    term: attribution?.term ?? 'none',
    landingPath: attribution?.landingPath ?? 'direct',
    firstSeenAt: attribution?.firstSeenAt ?? null,
  }
}
