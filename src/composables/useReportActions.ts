import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import { STATUS_PILLS } from '@/lib/reportStatus'
import type { Report, ReportStatus } from '@/types'

/**
 * Ce qu'un agent fait à un signalement : avancer, revenir, supprimer.
 *
 * Chaque geste dit ce qu'il a fait. Avant, une action réussie ne disait rien et
 * une action échouée écrivait dans la console : l'agent qui prenait trente
 * signalements en charge voyait la table se recharger et devait en déduire que
 * tout s'était bien passé — y compris quand ce n'était pas le cas.
 *
 * Les messages d'erreur du serveur sont repris tels quels quand il y en a un :
 * « Ce signalement est résolu » est une explication, « Une erreur est
 * survenue » n'en est pas une.
 */
export function useReportActions(options: {
  /** Recharger la table et les compteurs après une action. */
  refresh: () => Promise<void>
  /** Vider le cache de tout ce qu'une action fait bouger. */
  invalidate: () => void
}) {
  const { apiFetch, invalidateCache } = useApi()
  const toast = useToast()

  const actionLoading = ref(false)
  const deleteLoading = ref(false)

  function reason(err: unknown, fallback: string): string {
    const message = (err as { message?: string })?.message
    return message && message !== 'Failed to fetch' ? message : fallback
  }

  async function updateStatus(
    reportId: string,
    newStatus: ReportStatus,
    comment?: string
  ): Promise<boolean> {
    actionLoading.value = true
    try {
      await apiFetch(`/api/reports/${reportId}/status`, {
        method: 'PATCH',
        body: { status: newStatus, ...(comment ? { comment } : {}) },
      })

      invalidateCache(`/api/reports/${reportId}`)
      options.invalidate()
      await options.refresh()

      toast.success(`Statut mis à jour : ${STATUS_PILLS[newStatus].label}`)
      return true
    } catch (err) {
      toast.error('Changement de statut impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      actionLoading.value = false
    }
  }

  /**
   * Prendre en charge une sélection.
   *
   * En série plutôt qu'en parallèle : l'endpoint de statut est atomique par
   * signalement, et trente requêtes simultanées font surtout tomber le rate
   * limiter. Les signalements qui ne sont pas à cette étape sont ignorés, pas
   * renvoyés en erreur.
   */
  async function bulkTakeCharge(reports: Report[], selectedIds: string[]): Promise<void> {
    const targets = reports.filter(
      (report) => selectedIds.includes(report.id) &&
        (report.status === 'en_attente' || report.status === 'transmis')
    )

    if (targets.length === 0) {
      toast.info('Rien à prendre en charge', 'Les signalements sélectionnés sont déjà en cours ou résolus.')
      return
    }

    actionLoading.value = true
    let done = 0
    try {
      for (const report of targets) {
        await apiFetch(`/api/reports/${report.id}/status`, {
          method: 'PATCH',
          body: { status: 'pris_en_charge' },
        })
        done += 1
      }
      toast.success(`${done} signalement${done > 1 ? 's' : ''} pris en charge`)
    } catch (err) {
      // Ce qui est passé est passé : le dire évite de relancer toute la série.
      toast.error(
        done > 0 ? `${done} sur ${targets.length} pris en charge` : 'Prise en charge impossible',
        reason(err, 'Réessayez dans un instant.')
      )
    } finally {
      options.invalidate()
      await options.refresh()
      actionLoading.value = false
    }
  }

  async function deleteReport(report: Report): Promise<boolean> {
    deleteLoading.value = true
    try {
      await apiFetch(`/api/reports/${report.id}`, { method: 'DELETE' })
      options.invalidate()
      await options.refresh()
      toast.success('Signalement supprimé', report.reference ?? undefined)
      return true
    } catch (err) {
      toast.error('Suppression impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      deleteLoading.value = false
    }
  }

  async function deleteReports(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return false
    deleteLoading.value = true
    try {
      await apiFetch('/api/reports', { method: 'DELETE', body: { ids } })
      options.invalidate()
      await options.refresh()
      toast.success(`${ids.length} signalement${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`)
      return true
    } catch (err) {
      toast.error('Suppression impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    } finally {
      deleteLoading.value = false
    }
  }

  return { actionLoading, deleteLoading, updateStatus, bulkTakeCharge, deleteReport, deleteReports }
}
