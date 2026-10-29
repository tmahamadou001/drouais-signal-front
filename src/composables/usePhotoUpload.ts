import { ref } from 'vue'
import { useApi } from './useApi'

/**
 * Envoi d'une photo de résolution par un agent.
 *
 * Le seul reste de l'ancien parcours photo côté web : les citoyens passent
 * désormais par l'application mobile, mais un agent qui clôt un signalement
 * depuis le back-office joint encore la preuve de son intervention.
 *
 * L'endpoint (`POST /api/upload/resolution-photo`) est réservé aux
 * administrateurs du tenant et range le fichier sous
 * `resolutions/<tenant>/<report>/`, avec une URL signée valable un an.
 */

/** Ce que `middleware/upload.ts` accepte, et ce qu'il plafonne. */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024

export function usePhotoUpload() {
  const { apiFetch } = useApi()

  const uploading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Envoie la photo et rend son URL signée, ou `null` en cas d'échec.
   *
   * Ne lève pas : l'appelant est un gestionnaire de `<input type="file">` qui
   * doit pouvoir réarmer son champ quoi qu'il arrive. Le message d'erreur est
   * exposé séparément.
   */
  async function uploadResolutionPhoto(file: File, reportId: string): Promise<string | null> {
    error.value = null

    // Vérifié ici autant que côté serveur : un fichier de 40 Mo refusé après
    // l'avoir téléversé fait perdre du temps et de la bande passante à l'agent.
    if (!ACCEPTED.includes(file.type)) {
      error.value = 'Format non supporté. Utilisez JPG, PNG, WebP ou GIF.'
      return null
    }
    if (file.size > MAX_BYTES) {
      error.value = 'Photo trop lourde (5 Mo maximum).'
      return null
    }

    uploading.value = true

    try {
      const form = new FormData()
      form.append('photo', file)
      form.append('reportId', reportId)

      const response = await apiFetch<{ url: string; filePath: string }>(
        '/api/upload/resolution-photo',
        { method: 'POST', body: form, isFormData: true }
      )

      return response.url
    } catch (err: any) {
      error.value = err?.message ?? 'Envoi impossible.'
      return null
    } finally {
      uploading.value = false
    }
  }

  return { uploading, error, uploadResolutionPhoto }
}
