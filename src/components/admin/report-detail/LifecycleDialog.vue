<script setup lang="ts">
/**
 * Un seul dialogue pour les quatre gestes qui demandent une précision : annuler,
 * classer indésirable, rouvrir, prévoir une intervention.
 *
 * Le motif est obligatoire pour les trois premiers — l'habitant le lira (annulation,
 * réouverture) et l'audit le conservera. Le dialogue n'agit pas : il rend la saisie
 * et laisse l'appelant faire l'appel, pour que l'erreur reste affichée au bon endroit.
 */
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

export type LifecycleMode = 'annule' | 'indesirable' | 'reopen' | 'plan'

const props = defineProps<{
  open: boolean
  mode: LifecycleMode
  saving: boolean
  /** Date déjà prévue (AAAA-MM-JJ), pour la modifier ou la retirer. */
  currentDate?: string | null
  /** Combien de signalements le geste touche (le tableau en annule plusieurs d'un coup). */
  count?: number
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: { text: string; date: string | null; target: 'en_attente' | 'pris_en_charge' }]
}>()

const text = ref('')
const date = ref('')
const target = ref<'en_attente' | 'pris_en_charge'>('pris_en_charge')

watch(() => [props.open, props.mode], () => {
  if (!props.open) return
  text.value = ''
  date.value = props.currentDate ?? ''
  target.value = 'pris_en_charge'
}, { immediate: true })

const COPY: Record<LifecycleMode, { title: string; hint: string; cta: string; icon: string; label: string }> = {
  annule: {
    title: 'Annuler ce signalement',
    hint: 'L’habitant est prévenu, motif à l’appui. Le signalement sort de la carte publique.',
    cta: 'Annuler le signalement', icon: 'CircleX', label: 'Motif (lu par l’habitant)',
  },
  indesirable: {
    title: 'Classer comme indésirable',
    hint: 'Spam ou hors sujet. L’habitant n’est pas prévenu ; le signalement sort de la carte publique.',
    cta: 'Classer indésirable', icon: 'ShieldAlert', label: 'Motif (conservé dans l’audit)',
  },
  reopen: {
    title: 'Rouvrir ce signalement',
    hint: 'L’habitant est prévenu que son signalement est de nouveau à l’étude.',
    cta: 'Rouvrir', icon: 'RotateCcw', label: 'Motif de la réouverture',
  },
  plan: {
    title: 'Prévoir l’intervention',
    hint: 'La date est annoncée à l’habitant. Le statut ne change pas.',
    cta: 'Enregistrer', icon: 'CalendarClock', label: 'Précision (facultatif)',
  },
}

const copy = computed(() => {
  const base = COPY[props.mode]
  if ((props.count ?? 1) <= 1 || (props.mode !== 'annule' && props.mode !== 'indesirable')) return base
  const label = props.mode === 'annule' ? 'Annuler' : 'Classer comme indésirables'
  return { ...base, title: `${label} ${props.count} signalements`, cta: props.mode === 'annule' ? `Annuler ${props.count} signalements` : `Classer ${props.count} indésirables`, hint: `${base.hint} Le même motif vaut pour toute la sélection.` }
})
const needsReason = computed(() => props.mode !== 'plan')
const today = new Date().toISOString().slice(0, 10)

const valid = computed(() =>
  props.mode === 'plan' ? date.value !== '' : text.value.trim().length > 0
)

function submit() {
  if (!valid.value || props.saving) return
  emit('submit', { text: text.value.trim(), date: props.mode === 'plan' ? date.value : null, target: target.value })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="font-ui fixed inset-0 z-[80] flex items-center justify-center p-4" @keydown.esc="emit('close')">
      <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

      <form
        class="relative w-full max-w-[440px] overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg"
        data-testid="lifecycle-dialog" @submit.prevent="submit"
      >
        <header class="flex items-start gap-3 border-b border-line px-5 py-4">
          <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
            <AppIcon :name="copy.icon" :size="18" :stroke-width="1.75" class="text-brand-700" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">{{ copy.title }}</h2>
            <p class="mt-0.5 text-xs leading-[1.4] text-muted">{{ copy.hint }}</p>
          </div>
        </header>

        <div class="flex flex-col gap-3 px-5 py-4">
          <template v-if="mode === 'plan'">
            <label class="flex flex-col gap-1 text-xs font-semibold text-ink">
              Date d’intervention
              <input v-model="date" type="date" :min="today" required data-testid="plan-date"
                class="h-10 rounded-[10px] border border-line px-3 text-sm font-normal text-ink focus:border-brand-700 focus:outline-none">
            </label>
          </template>

          <label v-if="mode === 'reopen'" class="flex flex-col gap-1 text-xs font-semibold text-ink">
            Rouvrir à l’étape
            <select v-model="target" data-testid="reopen-target"
              class="h-10 rounded-[10px] border border-line bg-white px-3 text-sm font-normal text-ink">
              <option value="pris_en_charge">Pris en charge</option>
              <option value="en_attente">En attente</option>
            </select>
          </label>

          <label class="flex flex-col gap-1 text-xs font-semibold text-ink">
            {{ copy.label }}
            <textarea v-model="text" rows="3" maxlength="500" :required="needsReason" data-testid="lifecycle-text"
              class="resize-none rounded-[10px] border border-line px-3 py-2 text-sm font-normal leading-[1.4] text-ink focus:border-brand-700 focus:outline-none" />
          </label>
        </div>

        <footer class="flex items-center gap-2 border-t border-line px-5 py-3">
          <button
            v-if="mode === 'plan' && currentDate" type="button" :disabled="saving" data-testid="plan-remove"
            class="mr-auto h-9 rounded-[10px] px-3 text-[13px] font-semibold text-status-danger hover:bg-status-danger/10"
            @click="emit('submit', { text: '', date: null, target })"
          >
            Retirer la date
          </button>
          <button type="button" class="ml-auto h-9 rounded-[10px] border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-neutral-100" @click="emit('close')">
            Fermer
          </button>
          <button
            type="submit" :disabled="saving || !valid" data-testid="lifecycle-submit"
            class="h-9 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ copy.cta }}
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>
