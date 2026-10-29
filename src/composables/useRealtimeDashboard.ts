import { ref, readonly, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { useReportStatuses } from '@/composables/useReportStatuses'
import { useTenantStore } from '@/stores/tenant'
import type {
  RealtimeConnectionStatus,
  RealtimeNotification,
} from '@/types/realtime'

const newReportIds = ref<Set<string>>(new Set())
const connectionStatus = ref<RealtimeConnectionStatus>('connecting')
const notifications = ref<RealtimeNotification[]>([])
const unreadCount = ref(0)

export function useRealtimeDashboard(options: {
  onNewReport: (report: Record<string, any>) => void
  onStatusChange: (reportId: string, newStatus: string, oldStatus: string) => void
  onVoteChange: (reportId: string, newCount: number) => void
  /** Un habitant vient de répondre à un message de la commune. */
  onCitizenReply?: (comment: Record<string, any>) => void
}) {
  const { getCategoryDisplay } = useTenantCategories()
  const { getStatusConfig } = useReportStatuses()
  const tenant = useTenantStore()
  let channel: RealtimeChannel | null = null

  function addNotification(
    notif: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>
  ) {
    const notification: RealtimeNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    }

    notifications.value.unshift(notification)
    unreadCount.value++

    if (notifications.value.length > 20) {
      notifications.value.pop()
    }

    setTimeout(() => {
      removeNotification(notification.id)
    }, 8000)
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  function markAllRead() {
    notifications.value.forEach((n) => {
      n.read = true
    })
    unreadCount.value = 0
  }

  function highlightReport(reportId: string) {
    newReportIds.value.add(reportId)
    setTimeout(() => {
      newReportIds.value.delete(reportId)
    }, 3000)
  }

  async function connect() {
    // Toujours supprimer l'ancien canal avant d'en créer un nouveau
    // pour éviter le "mismatch between server and client bindings"
    if (channel) {
      await supabase.removeChannel(channel)
      channel = null
    }

    /**
     * Le canal est cadré sur la commune, côté serveur.
     *
     * Il ne l'était pas : un administrateur de La Loupe recevait les
     * insertions de **toutes** les communes de la plateforme, et
     * `onNewReport` les glissait dans son tableau en incrémentant ses
     * compteurs. La règle « toujours filtrer par `tenant_id` » vaut pour le
     * temps réel comme pour les requêtes — davantage même, puisqu'ici
     * personne ne relit la requête.
     *
     * Sans tenant, on ne s'abonne pas : un filtre absent ouvre tout.
     */
    const tenantId = tenant.tenantId
    if (!tenantId) {
      connectionStatus.value = 'disconnected'
      return
    }

    const inTenant = `tenant_id=eq.${tenantId}`

    connectionStatus.value = 'connecting'

    channel = supabase
      .channel(`dashboard-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports',
          filter: inTenant,
        },
        (payload: any) => {
          const newReport = payload.new

          options.onNewReport(newReport)
          highlightReport(newReport.id)

          addNotification({
            type: 'new_report',
            message: `Nouveau signalement reçu`,
            reportId: newReport.id,
            reportTitle:
              newReport.title || getCategoryDisplay(newReport.category) || 'Nouveau signalement',
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: inTenant,
        },
        (payload: any) => {
          const { id, status: newStatus, vote_count } = payload.new
          const { status: oldStatus, vote_count: oldVoteCount } = payload.old

          if (newStatus !== oldStatus) {
            options.onStatusChange(id, newStatus, oldStatus)

            const statusLabel = getStatusConfig(newStatus).label

            addNotification({
              type: 'status_change',
              message: `Statut mis à jour : ${statusLabel}`,
              reportId: id,
              reportTitle: payload.new.title ?? '',
            })
          }

          if (vote_count !== oldVoteCount) {
            options.onVoteChange(id, vote_count)
          }
        }
      )
      /**
       * Les réponses des habitants.
       *
       * C'est la moitié qui manquait : un agent envoyait un message et
       * n'apprenait jamais qu'on lui avait répondu — la pastille du tableau
       * n'était chargée qu'au montage de la page.
       *
       * Le filtre ne porte que sur la commune : `postgres_changes` n'accepte
       * qu'une condition. Le tri entre message d'agent et réponse d'habitant se
       * fait ici, sur la ligne reçue.
       */
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_comments',
          filter: inTenant,
        },
        (payload: any) => {
          const comment = payload.new
          if (comment?.author_type !== 'citizen') return

          options.onCitizenReply?.(comment)

          addNotification({
            type: 'citizen_reply',
            message: 'Un habitant a répondu à votre message',
            reportId: comment.report_id,
            reportTitle: '',
          })
        }
      )
      .subscribe((status, error) => {
        switch (status) {
          case 'SUBSCRIBED':
            connectionStatus.value = 'connected'
            break
          case 'CHANNEL_ERROR':
            connectionStatus.value = 'error'
            console.error('❌ Realtime erreur:', error)
            setTimeout(() => {
              connectionStatus.value = 'reconnecting'
              connect()
            }, 5000)
            break
          case 'TIMED_OUT':
            connectionStatus.value = 'reconnecting'
            console.warn('⚠️ Realtime timeout, reconnexion...')
            break
          case 'CLOSED':
            connectionStatus.value = 'disconnected'
            break
        }
      })
  }

  function disconnect() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
    connectionStatus.value = 'disconnected'
  }

  function handleVisibilityChange() {
    if (
      document.visibilityState === 'visible' &&
      connectionStatus.value === 'disconnected'
    ) {
      connectionStatus.value = 'reconnecting'
      connect()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  connect()

  onUnmounted(() => {
    disconnect()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    connectionStatus: readonly(connectionStatus),
    notifications: readonly(notifications),
    newReportIds: readonly(newReportIds),
    unreadCount: readonly(unreadCount),
    removeNotification,
    markAllRead,
    disconnect,
  }
}
