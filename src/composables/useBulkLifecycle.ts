import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

export interface BulkResult {
  done: string[]
  failed: { id: string; code: string; message: string }[]
}

/**
 * Annuler, classer indésirable ou fusionner depuis le tableau — une ligne ou une
 * sélection, par le même chemin : une ligne est une sélection d'un.
 *
 * Le serveur traite le lot signalement par signalement et rend ce qui est passé
 * et, pour le reste, pourquoi. L'écran le dit tel quel : « 4 annulés, 1 refusé »
 * avec le motif du refus, pour que l'agent sache lequel reste à faire.
 */
export function useBulkLifecycle(onDone: () => Promise<void> | void) {
  const { apiFetch, invalidateCachePattern } = useApi()
  const toast = useToast()
  const saving = ref(false)

  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

  /** Dit le résultat, et rend vrai si au moins un signalement est passé. */
  function report(result: BulkResult, verb: { one: string; many: string }): boolean {
    const { done, failed } = result
    if (failed.length === 0) {
      toast.success(`${plural(done.length, verb.one, verb.many)}`)
    } else if (done.length === 0) {
      toast.error('Rien n’a pu être fait', failed[0].message)
    } else {
      toast.info(
        `${plural(done.length, verb.one, verb.many)}, ${plural(failed.length, 'refusé', 'refusés')}`,
        failed[0].message
      )
    }
    return done.length > 0
  }

  async function run(path: string, body: Record<string, unknown>, verb: { one: string; many: string }): Promise<boolean> {
    saving.value = true
    try {
      const response = await apiFetch<{ data: BulkResult }>(path, { method: 'POST', body })
      invalidateCachePattern(/^\/api\/(admin\/(reports|counters|stats)|reports)/)
      const ok = report(response.data, verb)
      await onDone()
      return ok
    } catch (err) {
      const message = (err as { message?: string })?.message
      toast.error('Action impossible', message && message !== 'Failed to fetch' ? message : 'Réessayez dans un instant.')
      return false
    } finally {
      saving.value = false
    }
  }

  const closeMany = (ids: string[], status: 'annule' | 'indesirable', comment: string) =>
    run('/api/reports/close', { ids, status, comment },
      status === 'annule' ? { one: 'signalement annulé', many: 'signalements annulés' } : { one: 'signalement classé indésirable', many: 'signalements classés indésirables' })

  const mergeMany = (ids: string[], targetId: string) =>
    run('/api/reports/merge', { ids, targetId }, { one: 'doublon fusionné', many: 'doublons fusionnés' })

  return { saving, closeMany, mergeMany }
}
