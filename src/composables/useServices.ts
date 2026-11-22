import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import type { TenantService } from '@/types/team'

/**
 * Les services de la commune et leurs membres.
 *
 * Chaque geste dit ce qu'il a fait (toast), et un refus du serveur — nom déjà
 * pris, service encore utilisé — est affiché tel quel : il est déjà écrit en
 * français et dit quoi faire.
 */
const services = ref<TenantService[]>([])
const loading = ref(false)

export interface ServiceInput {
  name: string
  description: string | null
  color: string | null
}

function reason(err: unknown, fallback: string): string {
  const message = (err as { message?: string })?.message
  return message && message !== 'Failed to fetch' ? message : fallback
}

export function useServices() {
  const { apiFetch } = useApi()
  const toast = useToast()

  async function load(): Promise<void> {
    loading.value = true
    try {
      services.value = (await apiFetch<{ data: TenantService[] }>('/api/services')).data
    } catch (err) {
      toast.error('Services indisponibles', reason(err, 'Rechargez la page dans un instant.'))
    } finally {
      loading.value = false
    }
  }

  /** Renvoie `true` si le geste a réussi : l'écran referme alors sa boîte. */
  async function run(action: () => Promise<unknown>, success: string, failure: string): Promise<boolean> {
    try {
      await action()
      await load()
      toast.success(success)
      return true
    } catch (err) {
      toast.error(failure, reason(err, 'Réessayez dans un instant.'))
      return false
    }
  }

  const create = (input: ServiceInput) =>
    run(() => apiFetch('/api/services', { method: 'POST', body: input }), `Service « ${input.name} » créé`, 'Création impossible')

  const update = (id: string, input: ServiceInput) =>
    run(() => apiFetch(`/api/services/${id}`, { method: 'PATCH', body: input }), 'Service modifié', 'Modification impossible')

  const remove = (service: TenantService) =>
    run(() => apiFetch(`/api/services/${service.id}`, { method: 'DELETE' }), `Service « ${service.name} » supprimé`, 'Suppression impossible')

  const addMember = (serviceId: string, userId: string) =>
    run(() => apiFetch(`/api/services/${serviceId}/members`, { method: 'POST', body: { userId } }), 'Membre ajouté', 'Ajout impossible')

  const removeMember = (serviceId: string, userId: string) =>
    run(() => apiFetch(`/api/services/${serviceId}/members/${userId}`, { method: 'DELETE' }), 'Membre retiré', 'Retrait impossible')

  return { services, loading, load, create, update, remove, addMember, removeMember }
}
