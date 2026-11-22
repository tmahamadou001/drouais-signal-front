import { computed, ref } from 'vue'
import { useApi } from '@/composables/useApi'
import type { DirectoryMember } from '@/types/team'

/**
 * L'annuaire de l'équipe : qui peut se voir confier un signalement ou être cité.
 *
 * Au niveau du module : l'écran de la liste, la fiche, la boîte d'assignation et
 * le sélecteur de mentions lisent la **même** liste, et la redemander quatre
 * fois à l'ouverture serait quatre requêtes pour une réponse.
 */
const members = ref<DirectoryMember[]>([])
const loaded = ref(false)
let pending: Promise<void> | null = null

export function useTeamDirectory() {
  const { apiFetch } = useApi()

  /** Charge une fois ; les appels simultanés partagent la même requête. */
  function load(force = false): Promise<void> {
    if (loaded.value && !force) return Promise.resolve()
    if (pending) return pending

    pending = apiFetch<{ data: DirectoryMember[] }>('/api/team/members')
      .then((response) => {
        members.value = response.data
        loaded.value = true
      })
      .catch(() => {
        // Sans annuaire, les noms retombent sur « Un collègue » : moins d'information, jamais une fausse.
      })
      .finally(() => { pending = null })

    return pending
  }

  /** Ceux à qui l'on peut confier : un observateur consulte, il ne traite pas. */
  const assignable = computed(() => members.value.filter((member) => member.role !== 'observer'))

  const nameOf = (userId: string | null | undefined): string | null =>
    members.value.find((member) => member.userId === userId)?.name ?? null

  return { members, assignable, loaded, load, nameOf }
}

/** Réservé aux tests : repart d'un annuaire vide. */
export function resetTeamDirectory(): void {
  members.value = []
  loaded.value = false
  pending = null
}
