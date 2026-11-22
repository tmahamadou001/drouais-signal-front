import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useApi } from '@/composables/useApi'
import type { InternalMessage } from '@/types/team'

/**
 * Le fil interne d'un signalement : l'équipe se parle, l'habitant ne le lit jamais.
 *
 * `reportId` accepte une source réactive : le panneau garde le même composant
 * monté en passant d'un signalement à l'autre.
 */
export function useInternalMessages(reportId: MaybeRefOrGetter<string>) {
  const { apiFetch } = useApi()
  const messages = ref<InternalMessage[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    const id = toValue(reportId)
    if (!id) return
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<InternalMessage[]>(`/api/reports/${id}/comments/internal`)
      // Une réponse tardive ne doit pas écraser le fil du signalement qu'on regarde maintenant.
      if (toValue(reportId) === id) messages.value = data
    } catch (err) {
      error.value = (err as { message?: string }).message ?? 'Erreur de chargement'
    } finally {
      loading.value = false
    }
  }

  async function send(content: string, mentions: string[]): Promise<boolean> {
    sending.value = true
    error.value = null
    try {
      const message = await apiFetch<InternalMessage>(`/api/reports/${toValue(reportId)}/comments/internal`, {
        method: 'POST',
        body: { content, mentions },
      })
      messages.value.push(message)
      return true
    } catch (err) {
      error.value = (err as { message?: string }).message ?? "Erreur d'envoi"
      return false
    } finally {
      sending.value = false
    }
  }

  function reset() {
    messages.value = []
    error.value = null
  }

  return { messages, loading, sending, error, load, send, reset }
}
