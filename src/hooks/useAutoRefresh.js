import { useEffect, useRef, useCallback } from 'react'

/**
 * Auto-refreshes data at a given interval.
 * Pauses when tab is hidden (saves resources).
 * @param {Function} fetchFn - async function to call
 * @param {number} intervalMs - refresh interval
 * @param {Array} deps - dependencies to re-setup
 */
export default function useAutoRefresh(
  fetchFn,
  intervalMs = 60000,
  deps = []
) {
  const timerRef = useRef(null)
  const fetchRef = useRef(fetchFn)
  fetchRef.current = fetchFn

  const startRefresh = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchRef.current()
      }
    }, intervalMs)
  }, [intervalMs])

  useEffect(() => {
    startRefresh()

    const handleVisibility = () => {
      if (!document.hidden) {
        fetchRef.current()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(timerRef.current)
      document.removeEventListener(
        'visibilitychange', handleVisibility
      )
    }
  }, [...deps, intervalMs, startRefresh])
}
