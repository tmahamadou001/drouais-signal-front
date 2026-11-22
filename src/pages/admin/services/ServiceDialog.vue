<script setup lang="ts">
/**
 * Créer ou modifier un service.
 *
 * Un nom suffit. La description et la couleur sont un confort : la couleur
 * distingue deux services d'un coup d'œil dans la liste, la description dit à
 * quoi sert le service à celui qui vient de rejoindre l'équipe.
 */
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { ServiceInput } from '@/composables/useServices'
import type { TenantService } from '@/types/team'

const props = defineProps<{ open: boolean; service: TenantService | null; saving: boolean }>()
const emit = defineEmits<{ close: []; submit: [input: ServiceInput] }>()

/** Des teintes qui se distinguent entre elles, et du blanc de la page. */
const COLORS = ['#1A56A0', '#1D9E75', '#EF9F27', '#B4445C', '#6B4FA0', '#2B7A8C']

const name = ref('')
const description = ref('')
const color = ref<string | null>(null)

watch(() => [props.open, props.service] as const, ([open, service]) => {
  if (!open) return
  name.value = service?.name ?? ''
  description.value = service?.description ?? ''
  color.value = service?.color ?? null
}, { immediate: true })

const clean = computed(() => name.value.trim())
const valid = computed(() => clean.value.length >= 1 && clean.value.length <= 60)

function submit() {
  if (!valid.value || props.saving) return
  emit('submit', { name: clean.value, description: description.value.trim() || null, color: color.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="font-ui fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

        <form
          class="relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg"
          @submit.prevent="submit"
        >
          <header class="flex items-start gap-3 border-b border-line px-5 py-4">
            <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="Network" :size="18" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">
                {{ service ? 'Modifier le service' : 'Nouveau service' }}
              </h2>
              <p class="mt-0.5 text-xs leading-[1.4] text-muted">Voirie, Propreté, Espaces verts…</p>
            </div>
            <button type="button" class="flex-none p-1 text-faint hover:text-ink" aria-label="Fermer" @click="emit('close')">
              <AppIcon name="X" :size="18" />
            </button>
          </header>

          <div class="flex flex-col gap-4 px-5 py-5">
            <div class="flex flex-col gap-2">
              <label for="service-name" class="text-xs font-semibold leading-none text-muted">NOM</label>
              <input
                id="service-name" v-model="name" maxlength="60" autocomplete="off" placeholder="Voirie"
                class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="service-description" class="text-xs font-semibold leading-none text-muted">DESCRIPTION (FACULTATIF)</label>
              <textarea
                id="service-description" v-model="description" maxlength="300" rows="2"
                placeholder="Chaussée, trottoirs, signalisation"
                class="rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
              />
            </div>

            <div class="flex flex-col gap-2">
              <span class="text-xs font-semibold leading-none text-muted">COULEUR</span>
              <div class="flex items-center gap-2" role="radiogroup" aria-label="Couleur du service">
                <button
                  type="button" role="radio" :aria-checked="color === null"
                  class="flex h-7 w-7 items-center justify-center rounded-full border border-line text-faint"
                  :class="color === null ? 'ring-2 ring-brand-700 ring-offset-2' : ''"
                  title="Aucune" @click="color = null"
                >
                  <AppIcon name="Ban" :size="14" />
                </button>
                <button
                  v-for="swatch in COLORS" :key="swatch" type="button" role="radio" :aria-checked="color === swatch"
                  class="h-7 w-7 rounded-full" :style="{ backgroundColor: swatch }"
                  :class="color === swatch ? 'ring-2 ring-brand-700 ring-offset-2' : ''"
                  :title="swatch" @click="color = swatch"
                />
              </div>
            </div>
          </div>

          <footer class="flex justify-end gap-2 border-t border-line px-5 py-3">
            <button type="button" class="h-9 rounded-[10px] border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-neutral-100" @click="emit('close')">
              Annuler
            </button>
            <button
              type="submit" :disabled="!valid || saving"
              class="h-9 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ saving ? 'Enregistrement…' : service ? 'Enregistrer' : 'Créer le service' }}
            </button>
          </footer>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
