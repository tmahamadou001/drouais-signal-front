import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

export function useUnreadComments() {
  const { apiFetch } = useApi()
  const unreadByReport = ref<Record<string, number>>({})
  const totalUnread = ref(0)

  async function loadUnread(): Promise<void> {
    try {
      const data = await apiFetch<{
        total: number
        byReport: Record<string, number>
      }>('/api/comments/unread')
      unreadByReport.value = data.byReport
      totalUnread.value = data.total
    } catch {
      // Silencieux
    }
  }

  onMounted(loadUnread)

  return {
    unreadByReport,
    totalUnread,
    loadUnread,
  }
}
