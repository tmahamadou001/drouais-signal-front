import { useAuthStore } from '@/stores/auth'
import { useApiCache } from './useApiCache'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface ApiOptions {
  method?: string
  body?: any
  isFormData?: boolean
  signal?: AbortSignal
  cache?: {
    maxAge: number
  }
}

export function useApi() {
  const { getCached, setCache, invalidate, invalidatePattern, clear } = useApiCache()

  async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
    const auth = useAuthStore()
    const { method = 'GET', body, isFormData = false, signal, cache } = options

    if (cache && method === 'GET') {
      const cacheKey = `${path}`
      const cached = getCached<T>(cacheKey, cache.maxAge)
      
      if (cached !== null) {
        return cached
      }
    }

    const headers: Record<string, string> = {}

    if (auth.accessToken) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`
    }

    if (!isFormData && body) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur ${response.status}`)
    }

    const data = await response.json()

    if (cache && method === 'GET') {
      const cacheKey = `${path}`
      setCache(cacheKey, data)
    }

    return data
  }

  return { 
    apiFetch,
    invalidateCache: invalidate,
    invalidateCachePattern: invalidatePattern,
    clearCache: clear,
  }
}
