import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

/**
 * La saisie d'un signalement depuis le back-office.
 *
 * L'appel téléphonique, le passage à l'accueil, ce qu'un agent voit pendant sa
 * tournée. Le formulaire vit dans `components/admin/report-create/` ; ici, ce
 * qui parle au serveur.
 */

export interface DuplicateReport {
  id: string
  title: string
  category: string
  status: string
  distance_meters: number
  similarity_score: 'fort' | 'moyen' | 'faible'
  photo_url: string | null
  created_at: string
}

export interface ReportDraft {
  title: string
  description: string
  category: string
  position: { lat: number; lng: number } | null
  photo: File | null
}

export function emptyDraft(): ReportDraft {
  return { title: '', description: '', category: '', position: null, photo: null }
}

export function useCreateReport() {
  const { apiFetch } = useApi()
  const toast = useToast()

  const saving = ref(false)
  const duplicates = ref<DuplicateReport[]>([])
  const checkingDuplicates = ref(false)

  /**
   * Les signalements déjà enregistrés autour du point.
   *
   * Ce n'est pas un raffinement : l'agent qui saisit un appel est, de tous les
   * contributeurs, celui qui a le plus de chances de dupliquer — deux habitants
   * appellent pour le même nid-de-poule, l'un par l'application, l'autre par le
   * standard. On les montre **avant** l'enregistrement, et on n'empêche rien :
   * deux problèmes peuvent voisiner, c'est l'agent qui sait.
   */
  async function checkDuplicates(draft: ReportDraft): Promise<void> {
    if (!draft.position || !draft.category) {
      duplicates.value = []
      return
    }

    checkingDuplicates.value = true
    try {
      // Monté sur `/api/reports`, pas sur `/api/duplicates` : le routeur
      // s'appelle `duplicates` mais vit sous les signalements, comme dans
      // l'application mobile (`api/submit.ts`).
      const result = await apiFetch<{ reports: DuplicateReport[] }>(
        '/api/reports/check-duplicate',
        {
          method: 'POST',
          body: { lat: draft.position.lat, lng: draft.position.lng, category: draft.category },
        }
      )
      duplicates.value = result.reports ?? []
    } catch {
      // Un doublon non détecté ne doit pas empêcher une saisie.
      duplicates.value = []
    } finally {
      checkingDuplicates.value = false
    }
  }

  /** `null` en cas d'échec — le message a déjà été montré. */
  async function submit(draft: ReportDraft): Promise<{ id: string; reference: string | null } | null> {
    if (!draft.position) return null

    // Multipart même sans photo : le serveur lit la même route dans les deux
    // cas, et deux formats d'envoi pour un seul formulaire est une occasion de
    // plus de diverger.
    const form = new FormData()
    form.append('title', draft.title.trim())
    form.append('description', draft.description.trim())
    form.append('category', draft.category)
    form.append('lat', String(draft.position.lat))
    form.append('lng', String(draft.position.lng))
    if (draft.photo) form.append('photo', draft.photo)

    saving.value = true
    try {
      const result = await apiFetch<{ id: string; reference: string | null }>(
        '/api/reports/manual',
        { method: 'POST', body: form, isFormData: true }
      )

      toast.success(
        result.reference
          ? `Signalement ${result.reference} enregistré.`
          : 'Signalement enregistré.'
      )
      return result
    } catch (err: any) {
      toast.error(err?.message ?? 'Enregistrement impossible.')
      return null
    } finally {
      saving.value = false
    }
  }

  const canSubmit = computed(() => (draft: ReportDraft) =>
    draft.title.trim().length > 0 && draft.category.length > 0 && draft.position !== null
  )

  return { saving, duplicates, checkingDuplicates, checkDuplicates, submit, canSubmit }
}
