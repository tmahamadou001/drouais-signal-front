import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

/**
 * Les gestes hors du parcours en trois temps : rouvrir un signalement clos,
 * annoncer la date d'une intervention, fusionner un doublon, corriger la
 * catégorie. Annuler et classer « indésirable » passent
 * par le changement de statut ordinaire (`useReportActions`), avec un motif.
 *
 * Chacun dit ce qu'il a fait, et reprend le message du serveur quand il y en a un.
 */
export function useLifecycle() {
  const { apiFetch, invalidateCache } = useApi()
  const toast = useToast()
  const saving = ref(false)

  const reason = (err: unknown, fallback: string) => {
    const message = (err as { message?: string })?.message
    return message && message !== 'Failed to fetch' ? message : fallback
  }

  async function reopen(reportId: string, comment: string, status: 'en_attente' | 'pris_en_charge'): Promise<boolean> {
    saving.value = true
    try {
      await apiFetch(`/api/reports/${reportId}/reopen`, { method: 'POST', body: { comment, status } })
      invalidateCache(`/api/reports/${reportId}`)
      toast.success('Signalement rouvert', 'L’habitant en est informé.')
      return true
    } catch (err) {
      toast.error('Réouverture impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      saving.value = false
    }
  }

  async function plan(reportId: string, plannedFor: string | null, note: string | null): Promise<boolean> {
    saving.value = true
    try {
      await apiFetch(`/api/reports/${reportId}/plan`, { method: 'PUT', body: { plannedFor, note } })
      invalidateCache(`/api/reports/${reportId}`)
      toast.success(plannedFor ? 'Intervention prévue' : 'Date retirée', plannedFor ? 'L’habitant en est informé.' : undefined)
      return true
    } catch (err) {
      toast.error('Planification impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      saving.value = false
    }
  }

  /** Fusionne ce doublon dans un autre signalement. */
  async function merge(reportId: string, targetId: string): Promise<boolean> {
    saving.value = true
    try {
      await apiFetch(`/api/reports/${reportId}/merge`, { method: 'POST', body: { targetId } })
      invalidateCache(`/api/reports/${reportId}`)
      invalidateCache(`/api/reports/${targetId}`)
      toast.success('Doublon fusionné', 'Son auteur est prévenu et suit désormais le signalement principal.')
      return true
    } catch (err) {
      toast.error('Fusion impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      saving.value = false
    }
  }

  /** Corrige la catégorie — l'échéance, et l'aiguillage d'un signalement non confié, en découlent. */
  async function changeCategory(reportId: string, category: string): Promise<boolean> {
    saving.value = true
    try {
      await apiFetch(`/api/reports/${reportId}/category`, { method: 'PATCH', body: { category } })
      invalidateCache(`/api/reports/${reportId}`)
      toast.success('Catégorie corrigée')
      return true
    } catch (err) {
      toast.error('Correction impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      saving.value = false
    }
  }

  return { saving, reopen, plan, merge, changeCategory }
}
