import { api } from './config'

/**
 * The access token lives in a MODULE VARIABLE, never in localStorage: anything
 * readable by JavaScript is readable by an injected script, and this token is
 * the one that authorizes every request. The refresh, which is the long-lived
 * half, stays in an httpOnly cookie the page cannot touch at all.
 */
let accessToken: string | null = null

/** A module variable is invisible to React, so anything that needs to REACT to
 * the token changing (the SSE stream, which carries it in the URL) subscribes
 * here instead of trying to watch it. */
type TokenListener = (token: string | null) => void
const listeners = new Set<TokenListener>()

export function setAccessToken(token: string | null): void {
  accessToken = token
  listeners.forEach((listener) => listener(token))
}

export function getAccessToken(): string | null {
  return accessToken
}

export function onAccessTokenChange(listener: TokenListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

/** One refresh in flight at a time: a page that fires five requests at once
 * would otherwise rotate the refresh token five times, and rotation + reuse
 * detection would tear the whole session down (see RefreshToken). */
let refreshInFlight: Promise<string> | null = null

export async function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post<{ accessToken: string }>('/auth/refresh')
      .then((response) => {
        setAccessToken(response.data.accessToken)
        return response.data.accessToken
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Only a 401, only once per request, and never for the refresh call itself
    // (that one failing means the session is genuinely over).
    const isRefreshCall = original?.url?.includes('/auth/refresh')
    if (error.response?.status !== 401 || original?._retried || isRefreshCall) {
      throw error
    }

    original._retried = true
    try {
      await refreshAccessToken()
      return api(original)
    } catch {
      setAccessToken(null)
      throw error
    }
  },
)
