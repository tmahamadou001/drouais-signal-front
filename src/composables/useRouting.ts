import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import type { RoutingRule } from '@/types/team'

/** L'aiguillage : qui reçoit un signalement neuf, par catégorie. */
const rules = ref<RoutingRule[]>([])
const loading = ref(false)

export function useRouting() {
  const { apiFetch } = useApi()
  const toast = useToast()

  async function load(): Promise<void> {
    loading.value = true
    try {
      rules.value = (await apiFetch<{ data: RoutingRule[] }>('/api/routing')).data
    } catch {
      toast.error('Aiguillage indisponible', 'Rechargez la page dans un instant.')
    } finally {
      loading.value = false
    }
  }

  /** La règle d'une catégorie, ou `null`. */
  const ruleOf = (category: string): RoutingRule | null =>
    rules.value.find((rule) => rule.category === category) ?? null

  async function save(category: string, rule: { assigneeId: string | null; serviceId: string | null }): Promise<boolean> {
    // Ni personne ni service : c'est une suppression, et elle a sa route.
    if (!rule.assigneeId && !rule.serviceId) return remove(category)

    try {
      await apiFetch(`/api/routing/${encodeURIComponent(category)}`, { method: 'PUT', body: rule })
      await load()
      toast.success('Aiguillage enregistré')
      return true
    } catch (err) {
      toast.error('Enregistrement impossible', (err as { message?: string }).message ?? 'Réessayez dans un instant.')
      return false
    }
  }

  async function remove(category: string): Promise<boolean> {
    try {
      await apiFetch(`/api/routing/${encodeURIComponent(category)}`, { method: 'DELETE' })
      await load()
      toast.success('Règle retirée')
      return true
    } catch (err) {
      toast.error('Retrait impossible', (err as { message?: string }).message ?? 'Réessayez dans un instant.')
      return false
    }
  }

  return { rules, loading, load, ruleOf, save, remove }
}
