import { ref, readonly, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useRealtimeMyReports(userId: string, options: {
  onStatusChange: (reportId: string, newStatus: string) => void
  onVoteChange: (reportId: string, newCount: number) => void
}) {
  let channel: RealtimeChannel | null = null
  const isConnected = ref(false)

  function connect() {
    if (!userId) return

    channel = supabase
      .channel(`my-reports-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const { id, status: newStatus, vote_count } = payload.new
          const { status: oldStatus, vote_count: oldVoteCount } = payload.old

          if (newStatus !== oldStatus) {
            options.onStatusChange(id, newStatus)
          }

          if (vote_count !== oldVoteCount) {
            options.onVoteChange(id, vote_count)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isConnected.value = true
        } else if (status === 'CLOSED') {
          isConnected.value = false
        }
      })
  }

  function disconnect() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
      isConnected.value = false
    }
  }

  connect()

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected: readonly(isConnected),
    disconnect,
  }
}
