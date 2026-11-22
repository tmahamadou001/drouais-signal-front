import { ref } from 'vue'
import { useApi } from '@/composables/useApi'
import type { Counters } from '@/types/team'

/**
 * Les chiffres du menu et des filtres : ce qui m'est confié, ce que personne n'a, ce qui attend l'équipe ou l'habitant.
 *
 * Au niveau du module : le menu et la liste les lisent, et un second compteur
 * calculé ailleurs finirait par se contredire à l'écran.
 */
const counters = ref<Counters>({ mine: 0, unassigned: 0, replied: 0, waiting: 0 })

export function useCounters() {
  const { apiFetch } = useApi()

  async function load(): Promise<void> {
    try {
      counters.value = await apiFetch<Counters>('/api/admin/counters')
    } catch {
      // Silencieux : une pastille absente vaut mieux qu'un écran en erreur.
    }
  }

  return { counters, load }
}
