import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

export interface RenameTarget {
  id: string
  name: string
  slug: string
}

/**
 * Renommer l'adresse d'une commune : l'état de la boîte de dialogue et l'appel.
 *
 * Partagé par l'écran Plateforme et l'écran Prospects, qui proposent le même
 * geste. Le serveur garde l'ancienne adresse comme alias : on le dit dans la
 * confirmation, car c'est ce qui rend le geste sans danger pour l'application.
 */
export function useRenameSlug(onDone: () => void | Promise<void>) {
  const { apiFetch } = useApi()
  const toast = useToast()

  const target = ref<RenameTarget | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  function open(tenant: RenameTarget) {
    error.value = null
    target.value = tenant
  }

  function close() {
    if (submitting.value) return
    target.value = null
    error.value = null
  }

  async function submit(slug: string) {
    if (!target.value || submitting.value) return
    const tenant = target.value
    submitting.value = true
    error.value = null

    try {
      const result = await apiFetch<{ slug: string; previous_slug: string }>(
        `/api/tenant/${tenant.id}/slug`,
        { method: 'PATCH', body: { slug } },
      )
      target.value = null
      toast.success(`${tenant.name} · nouvelle adresse`, `${result.slug}.onsignale.fr`)
      await onDone()
    } catch (err) {
      const message = (err as { message?: string })?.message
      error.value = message && message !== 'Failed to fetch' ? message : 'Changement impossible. Réessayez dans un instant.'
    } finally {
      submitting.value = false
    }
  }

  return { target, submitting, error, open, close, submit }
}
