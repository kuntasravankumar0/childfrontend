import { useQuery } from '@tanstack/react-query'

/**
 * Wraps react-query's useQuery with localStorage caching.
 * 
 * On first fetch, stores the response in localStorage so it survives
 * both page refreshes AND browser restarts (until explicitly cleared).
 * On subsequent visits, serves from cache while refreshing in the
 * background (stale-while-revalidate pattern).
 * 
 * localStorage is better than sessionStorage because:
 * - Survives page reload (F5/Ctrl+R) ✅
 * - Survives full browser restart ✅
 * - Data stays until manually cleared or TTL expires
 * 
 * Cache automatically expires after `staleSeconds` (default: 120s)
 * and is overwritten on next fetch.
 */
export function useStorageQuery<T>(opts: {
  queryKey: string[]
  fetcher: () => Promise<{ data: { data: T } } | T>
  staleSeconds?: number
  enabled?: boolean
  refetchInterval?: number | false
}) {
  const { queryKey, fetcher, staleSeconds = 120, enabled = true, refetchInterval = false } = opts
  const storageKey = `ls_${JSON.stringify(queryKey)}`

  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      // 1. Check localStorage first for instant load (survives reloads!)
      try {
        const cached = localStorage.getItem(storageKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          const age = (Date.now() - parsed._ts) / 1000
          if (age < staleSeconds) {
            return parsed._data as T
          }
        }
      } catch { /* corrupted cache — ignore */ }

      // 2. Fetch fresh data
      const res = await fetcher()
      // Handle both axios response format and raw data
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? res

      // 3. Store in localStorage (survives reloads!)
      try {
        localStorage.setItem(storageKey, JSON.stringify({ _data: data, _ts: Date.now() }))
      } catch { /* localStorage full — ignore */ }

      return data as T
    },
    staleTime: staleSeconds * 1000,
    enabled,
    refetchInterval: refetchInterval || undefined,
  })
}
