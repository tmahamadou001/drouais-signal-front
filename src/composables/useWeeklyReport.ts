import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

/**
 * La synthèse hebdomadaire : son aperçu, ses destinataires, son envoi.
 *
 * Les trois gestes annonçaient leur résultat par `alert()` — la boîte native du
 * navigateur, qui bloque la page, ne ressemble à rien d'autre dans
 * l'application et ne peut pas dire *quoi* a échoué. Ils passent par les
 * toasts comme toutes les autres actions du back-office.
 */

export interface WeeklyStats {
  period: { from: string; to: string }
  new_reports: number
  resolved: number
  in_progress: number
  overdue: number
  vs_last_week: number
  by_category: Record<string, number>
  top_zones: Array<{ address: string; count: number }>
  total_votes: number
}

export interface Recipient {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  created_at: string
}

export interface NewRecipient {
  email: string
  name: string
  role: string
}

export function useWeeklyReport() {
  const { apiFetch, invalidateCachePattern } = useApi()
  const toast = useToast()

  const stats = ref<WeeklyStats | null>(null)
  const previewHtml = ref('')
  const recipients = ref<Recipient[]>([])

  const loadingPreview = ref(false)
  const loadingRecipients = ref(true)
  const sending = ref(false)
  const acting = ref(false)

  const active = computed(() => recipients.value.filter((one) => one.is_active))

  function reason(err: unknown, fallback: string): string {
    const message = (err as { message?: string })?.message
    return message && message !== 'Failed to fetch' ? message : fallback
  }

  async function loadPreview(): Promise<boolean> {
    loadingPreview.value = true
    try {
      const data = await apiFetch<{ stats: WeeklyStats; html: string }>(
        '/api/admin/weekly-report/preview'
      )
      stats.value = data.stats
      previewHtml.value = data.html
      return true
    } catch (err) {
      toast.error('Aperçu indisponible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      loadingPreview.value = false
    }
  }

  async function loadRecipients() {
    loadingRecipients.value = true
    try {
      const data = await apiFetch<{ recipients: Recipient[] }>(
        '/api/admin/weekly-report/recipients',
        { cache: { maxAge: 60_000 } }
      )
      recipients.value = data.recipients
    } catch (err) {
      toast.error('Destinataires indisponibles', reason(err, 'Rechargez la page.'))
    } finally {
      loadingRecipients.value = false
    }
  }

  function refresh() {
    invalidateCachePattern(/^\/api\/admin\/weekly-report\/recipients/)
    return loadRecipients()
  }

  async function send(): Promise<boolean> {
    sending.value = true
    try {
      await apiFetch('/api/admin/weekly-report/send', { method: 'POST' })
      const count = active.value.length
      toast.success(`Rapport envoyé à ${count} destinataire${count > 1 ? 's' : ''}`)
      return true
    } catch (err) {
      toast.error('Envoi impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      sending.value = false
    }
  }

  async function addRecipient(recipient: NewRecipient): Promise<boolean> {
    acting.value = true
    try {
      await apiFetch('/api/admin/weekly-report/recipients', { method: 'POST', body: recipient })
      await refresh()
      toast.success(`${recipient.name} recevra la synthèse`)
      return true
    } catch (err) {
      toast.error('Ajout impossible', reason(err, 'Vérifiez l’adresse saisie.'))
      return false
    } finally {
      acting.value = false
    }
  }

  async function removeRecipient(recipient: Recipient): Promise<boolean> {
    acting.value = true
    try {
      await apiFetch(`/api/admin/weekly-report/recipients/${recipient.id}`, { method: 'DELETE' })
      await refresh()
      toast.success(`${recipient.name} ne recevra plus la synthèse`)
      return true
    } catch (err) {
      toast.error('Retrait impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      acting.value = false
    }
  }

  return {
    stats, previewHtml, recipients, active,
    loadingPreview, loadingRecipients, sending, acting,
    loadPreview, loadRecipients, send, addRecipient, removeRecipient,
  }
}
