import { ref, readonly, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useRealtimeReport(reportId: string, options: {
  onStatusChange: (newStatus: string) => void
  onVoteChange: (newCount: number) => void
}) {
  let channel: RealtimeChannel | null = null
  const isConnected = ref(false)

  function connect() {
    if (!reportId) return

    channel = supabase
      .channel(`report-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: `id=eq.${reportId}`,
        },
        (payload: any) => {
          const { status: newStatus, vote_count } = payload.new
          const { status: oldStatus, vote_count: oldVoteCount } = payload.old

          if (newStatus !== oldStatus) {
            options.onStatusChange(newStatus)
          }

          if (vote_count !== oldVoteCount) {
            options.onVoteChange(vote_count)
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
