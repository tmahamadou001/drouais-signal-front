import { ref } from 'vue'
import { useApi } from '@/composables/useApi'

/**
 * Les réponses d'habitants que la commune n'a pas lues.
 *
 * Partagé entre la cloche de l'en-tête et les pastilles du tableau : les deux
 * comptent la même chose, et deux compteurs calculés séparément finiraient par
 * se contredire à l'écran.
 *
 * L'état est au niveau du module, pas de l'appel : plusieurs composants le
 * lisent, ils doivent voir le même.
 */

export interface UnreadItem {
  report_id: string
  report_title: string
  report_reference: string
  last_reply_at: string
  count: number
}

const unreadByReport = ref<Record<string, number>>({})
const items = ref<UnreadItem[]>([])
const totalUnread = ref(0)

export function useUnreadComments() {
  const { apiFetch } = useApi()

  async function loadUnread(): Promise<void> {
    try {
      const data = await apiFetch<{
        total: number
        byReport: Record<string, number>
        items: UnreadItem[]
      }>('/api/comments/unread')

      unreadByReport.value = data.byReport
      items.value = data.items ?? []
      totalUnread.value = data.total
    } catch {
      // Silencieux : un compteur absent vaut mieux qu'un écran en erreur.
    }
  }

  /**
   * Une réponse vient d'arriver en direct.
   *
   * Le compteur est incrémenté tout de suite — l'agent voit la pastille bouger
   * — et la liste rechargée en arrière-plan, parce que le titre et l'horodatage
   * viennent du serveur. Un onglet resté ouvert toute la journée dériverait
   * sinon, et un compteur faux s'apprend à ignorer.
   */
  function noteReply(reportId: string): void {
    unreadByReport.value = {
      ...unreadByReport.value,
      [reportId]: (unreadByReport.value[reportId] ?? 0) + 1,
    }
    totalUnread.value += 1

    void loadUnread()
  }

  /**
   * L'agent vient d'ouvrir ce fil.
   *
   * Le serveur a marqué les messages lus en répondant à `GET /comments` ; il
   * reste à l'annoncer ici, sans quoi la pastille survit jusqu'au prochain
   * rechargement de la page.
   */
  function markRead(reportId: string): void {
    const seen = unreadByReport.value[reportId] ?? 0
    if (seen === 0) return

    const next = { ...unreadByReport.value }
    delete next[reportId]

    unreadByReport.value = next
    totalUnread.value = Math.max(0, totalUnread.value - seen)
    items.value = items.value.filter((item) => item.report_id !== reportId)
  }

  return {
    unreadByReport,
    items,
    totalUnread,
    loadUnread,
    noteReply,
    markRead,
  }
}
