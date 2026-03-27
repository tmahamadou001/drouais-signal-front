import { useAuthStore } from '@/stores/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface ApiOptions {
  method?: string
  body?: any
  isFormData?: boolean
  signal?: AbortSignal
}

export function useApi() {
  async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
    const auth = useAuthStore()
    const { method = 'GET', body, isFormData = false, signal } = options

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

    return response.json()
  }

  return { apiFetch }
}
