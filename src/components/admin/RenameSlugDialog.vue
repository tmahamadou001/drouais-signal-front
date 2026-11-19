<script setup lang="ts">
/**
 * Changer l'adresse d'une commune.
 *
 * Le slug circule : l'application mobile le mémorise, des liens d'e-mail le
 * contiennent. Le serveur garde donc l'ancien comme alias, et la boîte le dit —
 * c'est ce qui rend le geste sans danger, donc ce qu'il faut savoir avant de
 * valider. La proposition retire le code INSEE que la création automatique ajoute.
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { slugProblem, suggestSlug, SLUG_PROBLEMS } from '@/lib/tenantSlug'
import type { RenameTarget } from '@/composables/useRenameSlug'

const props = defineProps<{
  tenant: RenameTarget | null
  submitting: boolean
  /** Le refus du serveur, par exemple « déjà utilisée ». */
  error: string | null
}>()

const emit = defineEmits<{ close: []; submit: [slug: string] }>()

const value = ref('')

watch(
  () => props.tenant,
  (tenant) => {
    value.value = tenant ? suggestSlug(tenant.slug) : ''
  },
  { immediate: true },
)

const clean = computed(() => value.value.trim().toLowerCase())
const problem = computed(() => (clean.value ? slugProblem(clean.value) : null))
const unchanged = computed(() => clean.value === props.tenant?.slug)
const valid = computed(() => clean.value !== '' && problem.value === null && !unchanged.value)

function submit() {
  if (!valid.value || props.submitting) return
  emit('submit', clean.value)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="tenant" class="font-ui fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

        <form
          class="relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg"
          @submit.prevent="submit"
        >
          <header class="flex items-start gap-3 border-b border-line px-5 py-4">
            <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="Link" :size="18" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">Changer l’adresse</h2>
              <p class="mt-0.5 truncate text-xs leading-[1.4] text-muted">{{ tenant.name }}</p>
            </div>
            <button type="button" class="flex-none p-1 text-faint hover:text-ink" aria-label="Fermer" @click="emit('close')">
              <AppIcon name="X" :size="18" />
            </button>
          </header>

          <div class="flex flex-col gap-3 px-5 py-5">
            <p class="text-xs leading-[1.45] text-muted">
              Actuelle : <strong class="text-ink">{{ tenant.slug }}.onsignale.fr</strong>
            </p>

            <label for="rename-slug" class="text-xs font-semibold leading-none text-muted">NOUVELLE ADRESSE</label>
            <div class="flex items-center gap-2">
              <input
                id="rename-slug"
                v-model="value"
                autocomplete="off"
                class="h-10 min-w-0 flex-1 rounded-[10px] border bg-white px-3.5 text-sm text-ink outline-none focus:border-brand-700"
                :class="problem || error ? 'border-status-danger' : 'border-line'"
              />
              <span class="flex-none text-sm text-muted">.onsignale.fr</span>
            </div>

            <p v-if="error" class="text-xs leading-[1.45] text-status-danger" role="alert">{{ error }}</p>
            <p v-else-if="problem" class="text-xs leading-[1.45] text-status-danger">{{ SLUG_PROBLEMS[problem] }}</p>
            <p v-else-if="unchanged" class="text-xs leading-[1.45] text-muted">C’est déjà l’adresse actuelle.</p>

            <p class="rounded-[10px] bg-brand-50 px-3.5 py-3 text-xs leading-[1.5] text-brand-900">
              <strong>L’ancienne adresse continue de fonctionner</strong> : les téléphones qui l’ont
              adoptée et les liens déjà envoyés par e-mail restent valables. Elle ne pourra pas être
              donnée à une autre commune.
            </p>
          </div>

          <footer class="flex justify-end gap-2 border-t border-line px-5 py-3">
            <button
              type="button"
              class="h-9 rounded-[10px] border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-neutral-100"
              @click="emit('close')"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="h-9 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!valid || submitting"
            >
              {{ submitting ? 'Changement…' : 'Changer l’adresse' }}
            </button>
          </footer>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
