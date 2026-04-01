interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<any>>()

export function useApiCache() {
  function getCached<T>(key: string, maxAge: number): T | null {
    const entry = cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > maxAge) {
      cache.delete(key)
      return null
    }

    return entry.data as T
  }

  function setCache<T>(key: string, data: T): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  function invalidate(key: string): void {
    cache.delete(key)
  }

  function invalidatePattern(pattern: RegExp): void {
    for (const key of cache.keys()) {
      if (pattern.test(key)) {
        cache.delete(key)
      }
    }
  }

  function clear(): void {
    cache.clear()
  }

  function getStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    }
  }

  return {
    getCached,
    setCache,
    invalidate,
    invalidatePattern,
    clear,
    getStats,
  }
}
