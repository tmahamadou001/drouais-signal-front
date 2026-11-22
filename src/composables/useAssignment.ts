import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

export interface AssignmentInput {
  /** `undefined` : ne pas y toucher. `null` : retirer la personne. */
  assigneeId?: string | null
  serviceId?: string | null
  /** « Confier aussi les prochains signalements » — réservé aux administrateurs. */
  alsoRoute?: boolean
}

export interface AssignmentResult {
  assigneeId: string | null
  serviceId: string | null
  changed: boolean
  routed: boolean
}

/** Confier un signalement à une personne et/ou un service. */
export function useAssignment() {
  const { apiFetch, invalidateCachePattern } = useApi()
  const toast = useToast()
  const saving = ref(false)

  async function assign(reportId: string, input: AssignmentInput): Promise<AssignmentResult | null> {
    saving.value = true
    try {
      const response = await apiFetch<{ data: AssignmentResult }>(`/api/reports/${reportId}/assign`, {
        method: 'POST',
        body: input,
      })

      // La liste, les compteurs du menu et la charge par agent ont tous bougé.
      invalidateCachePattern(/^\/api\/admin\/(reports|counters|workload)/)

      if (!response.data.changed) toast.info('Rien à changer', 'Ce signalement est déjà confié ainsi.')
      else toast.success(response.data.assigneeId || response.data.serviceId ? 'Signalement confié' : 'Signalement remis « à assigner »')

      return response.data
    } catch (err) {
      toast.error('Assignation impossible', (err as { message?: string }).message ?? 'Réessayez dans un instant.')
      return null
    } finally {
      saving.value = false
    }
  }

  return { assign, saving }
}
