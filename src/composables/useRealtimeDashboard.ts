import { ref, readonly, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { useReportStatuses } from '@/composables/useReportStatuses'
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
}) {
  const { getCategoryDisplay } = useTenantCategories()
  const { getStatusConfig } = useReportStatuses()
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

  function connect() {
    connectionStatus.value = 'connecting'

    channel = supabase
      .channel('dashboard-admin-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports',
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
