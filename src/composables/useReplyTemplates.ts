import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

export interface ReplyTemplate {
  id: string
  title: string
  body: string
  updatedAt: string
}

/**
 * Les réponses types de la commune, partagées entre le sélecteur du panneau de
 * détail et la page de gestion : une seule liste, chargée une fois, mise à jour
 * par les gestes de l'administrateur.
 */
const templates = ref<ReplyTemplate[]>([])
const loaded = ref(false)
const loading = ref(false)

export function useReplyTemplates() {
  const { apiFetch } = useApi()
  const toast = useToast()

  const reason = (err: unknown, fallback: string) => {
    const message = (err as { message?: string })?.message
    return message && message !== 'Failed to fetch' ? message : fallback
  }

  async function load(force = false) {
    if ((loaded.value && !force) || loading.value) return
    loading.value = true
    try {
      const res = await apiFetch<{ data: ReplyTemplate[] }>('/api/reply-templates')
      templates.value = res.data
      loaded.value = true
    } catch {
      // Le sélecteur reste simplement vide : écrire à la main fonctionne toujours.
    } finally {
      loading.value = false
    }
  }

  async function save(input: { title: string; body: string }, id?: string): Promise<boolean> {
    try {
      await apiFetch(id ? `/api/reply-templates/${id}` : '/api/reply-templates', {
        method: id ? 'PATCH' : 'POST',
        body: input,
      })
      await load(true)
      toast.success(id ? 'Modèle modifié' : 'Modèle créé')
      return true
    } catch (err) {
      toast.error('Enregistrement impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    }
  }

  async function remove(id: string): Promise<boolean> {
    try {
      await apiFetch(`/api/reply-templates/${id}`, { method: 'DELETE' })
      templates.value = templates.value.filter((template) => template.id !== id)
      toast.success('Modèle supprimé')
      return true
    } catch (err) {
      toast.error('Suppression impossible', reason(err, 'Réessayez dans un instant.'))
      return false
    }
  }

  return { templates, loading, load, save, remove }
}
