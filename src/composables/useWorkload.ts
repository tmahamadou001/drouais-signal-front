import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import type { WorkloadAgent } from '@/types/team'

/** La charge par agent — pour répartir le travail, pas pour noter les personnes. */
export function useWorkload() {
  const { apiFetch } = useApi()
  const agents = ref<WorkloadAgent[]>([])
  const unassigned = ref(0)
  const loading = ref(false)
  const failed = ref(false)

  async function load(): Promise<void> {
    loading.value = true
    failed.value = false
    try {
      const data = await apiFetch<{ agents: WorkloadAgent[]; unassigned: number }>('/api/admin/workload')
      agents.value = data.agents
      unassigned.value = data.unassigned
    } catch {
      failed.value = true
    } finally {
      loading.value = false
    }
  }

  return { agents, unassigned, loading, failed, load }
}
