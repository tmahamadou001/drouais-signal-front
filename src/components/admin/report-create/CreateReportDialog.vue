<script setup lang="ts">
/**
 * Saisir un signalement depuis le back-office.
 *
 * L'appel téléphonique, le passage à l'accueil, le potelet qu'un agent voit
 * pendant sa tournée : la majorité de ce qu'une mairie traite n'arrive pas par
 * l'application, et vivait jusqu'ici dans un carnet.
 *
 * Le signalement démarre en **en attente**, comme tout signalement. Un agent
 * saisit souvent quelque chose de déjà traité, et lui laisser choisir le statut
 * de départ fabriquerait un historique faux : `status_history` prétendrait que
 * le signalement est passé par « en attente » à l'instant. Il le fait avancer
 * juste après — un clic de plus, un journal qui dit la vérité.
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useTenantStore } from '@/stores/tenant'
import { useCreateReport, emptyDraft, type ReportDraft } from '@/composables/useCreateReport'
import LocationPicker from './LocationPicker.vue'
import PhotoField from './PhotoField.vue'
import DuplicateHint from './DuplicateHint.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>()

const tenantStore = useTenantStore()
const { saving, duplicates, checkDuplicates, submit } = useCreateReport()

const draft = ref<ReportDraft>(emptyDraft())

/** Le point est tombé hors de la commune : le serveur refuserait (422). */
const outsideCommune = ref(false)

// Remis à neuf à chaque ouverture : rouvrir sur la saisie précédente, à demi
// effacée, invite à enregistrer un mélange des deux.
watch(
  () => props.open,
  (open) => {
    if (open) {
      draft.value = emptyDraft()
      duplicates.value = []
      lastChecked = null
      outsideCommune.value = false
    }
  }
)

/**
 * La recherche de doublons, tenue en laisse.
 *
 * Elle ne part qu'une fois connus les deux éléments qui la définissent — le
 * point et la catégorie — et **pas à chaque frame de glissement de l'épingle**.
 * Le serveur limite cet appel à dix par minute et par utilisateur : un agent
 * qui ajuste sa position pendant trois secondes épuisait le quota, après quoi
 * l'écran cessait silencieusement de signaler quoi que ce soit — le pire des
 * deux mondes, puisque l'absence d'avertissement se lit comme « rien à
 * signaler ».
 *
 * D'où l'attente de 500 ms après le dernier geste, et le saut des déplacements
 * inférieurs à la dizaine de mètres, qui ne changent pas la réponse : le
 * serveur cherche dans un rayon de 80 m.
 */
const DUPLICATE_DEBOUNCE_MS = 500
/** ~11 m sous nos latitudes, la précision d'un relevé GPS de téléphone. */
const SAME_SPOT = 1e-4

let debounce: ReturnType<typeof setTimeout> | null = null
let lastChecked: { lat: number; lng: number; category: string } | null = null

watch(
  () => [draft.value.position, draft.value.category],
  () => {
    const { position, category } = draft.value
    if (!position || !category) return

    const moved =
      !lastChecked ||
      lastChecked.category !== category ||
      Math.abs(lastChecked.lat - position.lat) > SAME_SPOT ||
      Math.abs(lastChecked.lng - position.lng) > SAME_SPOT

    if (!moved) return

    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      lastChecked = { lat: position.lat, lng: position.lng, category }
      void checkDuplicates(draft.value)
    }, DUPLICATE_DEBOUNCE_MS)
  },
  { deep: true }
)

onUnmounted(() => {
  if (debounce) clearTimeout(debounce)
})

const canSubmit = computed(
  () =>
    draft.value.title.trim().length > 0 &&
    draft.value.category.length > 0 &&
    draft.value.position !== null &&
    !outsideCommune.value &&
    !saving.value
)

async function save() {
  if (!canSubmit.value) return
  if (await submit(draft.value)) {
    emit('created')
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-ink/40" @click="emit('close')" />

      <div class="relative flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[16px] bg-white shadow-ds-lg">
        <header class="flex flex-none items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 class="text-[15px] font-semibold text-ink">Nouveau signalement</h2>
            <p class="mt-0.5 text-[12px] text-muted">
              Un appel, un passage à l’accueil, un constat de tournée.
            </p>
          </div>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-canvas"
            aria-label="Fermer"
            @click="emit('close')"
          >
            <AppIcon name="X" :size="17" class="text-muted" />
          </button>
        </header>

        <div class="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-5 md:grid-cols-2">
          <div class="flex flex-col gap-4">
            <label class="flex flex-col gap-1.5">
              <span class="text-[12px] font-semibold text-muted">TITRE</span>
              <input
                v-model="draft.title"
                type="text"
                maxlength="200"
                placeholder="Nid-de-poule rue de la Gare"
                class="h-[38px] rounded-[10px] border border-line px-3 text-[13px] text-ink outline-none focus:border-brand-700"
              />
            </label>

            <label class="flex flex-col gap-1.5">
              <span class="text-[12px] font-semibold text-muted">CATÉGORIE</span>
              <select
                v-model="draft.category"
                class="h-[38px] rounded-[10px] border border-line bg-white px-3 text-[13px] text-ink outline-none focus:border-brand-700"
              >
                <option value="" disabled>Choisir une catégorie</option>
                <option
                  v-for="category in tenantStore.activeCategories"
                  :key="category.slug"
                  :value="category.slug"
                >
                  {{ category.label }}
                </option>
              </select>
            </label>

            <label class="flex flex-1 flex-col gap-1.5">
              <span class="text-[12px] font-semibold text-muted">DESCRIPTION</span>
              <textarea
                v-model="draft.description"
                maxlength="4000"
                rows="4"
                placeholder="Ce que la personne a décrit."
                class="min-h-[96px] flex-1 resize-none rounded-[10px] border border-line px-3 py-2.5 text-[13px] leading-[1.5] text-ink outline-none focus:border-brand-700"
              />
            </label>

            <PhotoField
              :photo="draft.photo"
              @update:photo="draft.photo = $event"
            />
          </div>

          <div class="flex flex-col gap-3">
            <span class="text-[12px] font-semibold text-muted">LOCALISATION</span>
            <LocationPicker
              :position="draft.position"
              @update:position="draft.position = $event"
              @update:outside="outsideCommune = $event"
            />
            <DuplicateHint :duplicates="duplicates" />
          </div>
        </div>

        <footer class="flex flex-none items-center justify-end gap-2.5 border-t border-line px-6 py-4">
          <button
            class="h-[38px] rounded-[10px] border border-line px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-canvas"
            @click="emit('close')"
          >
            Annuler
          </button>
          <button
            class="flex h-[38px] items-center gap-2 rounded-[10px] bg-brand-700 px-4 transition-colors hover:bg-brand-800 disabled:opacity-50"
            :disabled="!canSubmit"
            @click="save"
          >
            <AppIcon :name="saving ? 'Loader' : 'Plus'" :size="15" :stroke-width="2"
              :class="['text-white', saving ? 'animate-spin' : '']" />
            <span class="text-[13px] font-semibold text-white">
              {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
            </span>
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
