const COOKIE_NAME = 'pokemon-calc.prefs'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const SUPPORTED_LOCALES = new Set(['en', 'zh-Hans', 'zh-Hant', 'ja'])
const TEAM_SIZE = 6

export interface PersistedPrefs {
  locale: string
  ourTeam: (string | null)[]
  tipsDismissed?: boolean
}

function cookiePath(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base.slice(0, -1) || '/' : base
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`))
  if (!match) return null
  return decodeURIComponent(match.slice(name.length + 1))
}

function writeCookie(name: string, value: string): void {
  const path = cookiePath()
  document.cookie = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

function normalizeTeam(slugs: unknown): (string | null)[] {
  if (!Array.isArray(slugs)) {
    return Array.from({ length: TEAM_SIZE }, () => null)
  }

  return Array.from({ length: TEAM_SIZE }, (_, index) => {
    const slug = slugs[index]
    return typeof slug === 'string' && slug.length > 0 ? slug : null
  })
}

export function readPersistedPrefs(): PersistedPrefs | null {
  const raw = readCookie(COOKIE_NAME)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedPrefs>
    const locale =
      typeof parsed.locale === 'string' && SUPPORTED_LOCALES.has(parsed.locale)
        ? parsed.locale
        : 'en'

    return {
      locale,
      ourTeam: normalizeTeam(parsed.ourTeam),
      tipsDismissed: parsed.tipsDismissed === true,
    }
  } catch {
    return null
  }
}

export function writePersistedPrefs(prefs: PersistedPrefs): void {
  const payload: Record<string, unknown> = {
    locale: prefs.locale,
    ourTeam: normalizeTeam(prefs.ourTeam),
  }
  if (prefs.tipsDismissed) {
    payload.tipsDismissed = true
  }
  writeCookie(COOKIE_NAME, JSON.stringify(payload))
}

export function dismissTips(): void {
  const current = readPersistedPrefs() ?? {
    locale: 'en',
    ourTeam: normalizeTeam([]),
  }
  writePersistedPrefs({ ...current, tipsDismissed: true })
}

export function teamToSlugs(team: Array<{ name: string } | null>): (string | null)[] {
  return normalizeTeam(team.map((mon) => mon?.name ?? null))
}
