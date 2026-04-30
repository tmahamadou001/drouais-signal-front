import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import type { ReportComment } from '@/types/comment'

export const useReportComments = (reportId: string) => {
  const { apiFetch } = useApi()
  const authStore = useAuthStore()

  const comments = ref<ReportComment[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const error = ref<string | null>(null)

  const isAgent = computed(
    () => authStore.isAdmin || authStore.isAgent
  )

  // Transform snake_case API → camelCase frontend
  function transformComment(raw: any): ReportComment {
    return {
      id: raw.id,
      reportId: raw.report_id,
      authorType: raw.author_type,
      authorId: raw.author_id,
      content: raw.content,
      photoUrl: raw.photo_url,
      isResolutionPhoto: raw.is_resolution_photo,
      parentId: raw.parent_id,
      reportStatusAtTime: raw.report_status_at_time,
      readByCitizen: raw.read_by_citizen,
      readByAgent: raw.read_by_agent,
      createdAt: raw.created_at,
      author: raw.author,
      replies: raw.replies?.map(transformComment) || [],
    }
  }

  const load = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<any[]>(
        `/api/reports/${reportId}/comments`
      )
      comments.value = data.map(transformComment)
    } catch (err: any) {
      error.value = err.error
        ?? 'Erreur de chargement'
    } finally {
      loading.value = false
    }
  }

  const postAgentMessage = async (
    content: string,
    photoUrl?: string,
    isResolutionPhoto = false
  ): Promise<boolean> => {
    sending.value = true
    error.value = null
    try {
      const rawComment = await apiFetch<any>(
        `/api/reports/${reportId}/comments/agent`,
        {
          method: 'POST',
          body: { content, photoUrl, isResolutionPhoto },
        }
      )
      // Transform and add to local without reloading
      const comment = transformComment(rawComment)
      comments.value.push({ ...comment, replies: [] })
      return true
    } catch (err: any) {
      error.value = err.error ?? 'Erreur d\'envoi'
      return false
    } finally {
      sending.value = false
    }
  }

  const postCitizenReply = async (
    content: string,
    parentId: string
  ): Promise<boolean> => {
    sending.value = true
    error.value = null
    try {
      const rawReply = await apiFetch<any>(
        `/api/reports/${reportId}/comments/citizen`,
        {
          method: 'POST',
          body: { content, parentId },
        }
      )
      // Transform and add the reply to the correct parent
      const reply = transformComment(rawReply)
      const parent = comments.value
        .find(c => c.id === parentId)
      if (parent) {
        if (!parent.replies) parent.replies = []
        parent.replies.push(reply)
      }
      return true
    } catch (err: any) {
      error.value = err.error ?? 'Erreur d\'envoi'
      return false
    } finally {
      sending.value = false
    }
  }

  // verify if citizen has replied to a message
  const hasReplied = (parentId: string): boolean => {
    const parent = comments.value
      .find(c => c.id === parentId)
    if (!parent?.replies) return false
    return parent.replies.some(
      r => r.authorId === authStore.user?.id
    )
  }

  return {
    comments,
    loading,
    sending,
    error,
    isAgent,
    load,
    postAgentMessage,
    postCitizenReply,
    hasReplied,
  }
}
