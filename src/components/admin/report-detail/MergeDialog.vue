<script setup lang="ts">
/**
 * Fusionner ce signalement dans un autre — celui qui reste.
 *
 * On cherche par titre, adresse ou référence (la même recherche que la liste) ;
 * les signalements clos et le signalement courant sont écartés, parce que le
 * serveur les refuserait. Rien ne part avant la confirmation : fusionner annule
 * le doublon et prévient son auteur, ce qui ne se défait que par « Rouvrir ».
 */
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useApi } from '@/composables/useApi'
import { isClosed, statusPill } from '@/lib/reportStatus'
import type { Report } from '@/types'

const props = defineProps<{
  open: boolean
  /** Le doublon fusionné depuis la fiche. */
  reportId?: string
  /** Ceux qu'on fusionne depuis le tableau : ils ne peuvent pas être le principal. */
  excludeIds?: string[]
  saving: boolean
}>()
const emit = defineEmits<{ close: []; merge: [targetId: string] }>()

const { apiFetch } = useApi()
const many = computed(() => (props.excludeIds?.length ?? 0) > 1)
const query = ref('')
const results = ref<Report[]>([])
const searching = ref(false)
const chosen = ref<Report | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

watch(() => props.open, (open) => {
  if (!open) return
  query.value = ''
  results.value = []
  chosen.value = null
}, { immediate: true })

watch(query, (value) => {
  clearTimeout(timer)
  if (value.trim().length < 2) { results.value = []; return }
  // Une frappe n'est pas une requête : on attend qu'elle s'arrête.
  timer = setTimeout(async () => {
    searching.value = true
    try {
      const response = await apiFetch<{ data: Report[] }>(`/api/admin/reports?search=${encodeURIComponent(value.trim())}&scope=all&limit=8`)
      const excluded = new Set([props.reportId, ...(props.excludeIds ?? [])])
      results.value = response.data.filter((report) => !excluded.has(report.id) && !isClosed(report.status))
    } catch {
      results.value = []
    } finally {
      searching.value = false
    }
  }, 250)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="font-ui fixed inset-0 z-[80] flex items-center justify-center p-4" @keydown.esc="emit('close')">
      <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

      <div class="relative flex max-h-[88vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg" data-testid="merge-dialog">
        <header class="flex items-start gap-3 border-b border-line px-5 py-4">
          <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
            <AppIcon name="GitMerge" :size="18" :stroke-width="1.75" class="text-brand-700" />
          </div>
          <div>
            <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">{{ many ? `Fusionner ${excludeIds!.length} signalements dans…` : 'Fusionner avec un autre signalement' }}</h2>
            <p class="mt-0.5 text-xs leading-[1.4] text-muted">
              {{ many ? 'Ces signalements seront annulés comme doublons du principal que vous choisissez.' : 'Ce signalement sera annulé comme doublon.' }}
              Leurs auteurs sont prévenus et suivent le signalement principal.
            </p>
          </div>
        </header>

        <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
          <input
            v-model="query" type="search" placeholder="Titre, adresse ou référence du signalement principal…"
            data-testid="merge-search" class="h-10 rounded-[10px] border border-line px-3 text-sm focus:border-brand-700 focus:outline-none"
          >

          <p v-if="query.trim().length >= 2 && !searching && results.length === 0" class="py-3 text-center text-[13px] text-muted" data-testid="merge-empty">
            Aucun signalement ouvert ne correspond.
          </p>

          <button
            v-for="report in results" :key="report.id" type="button" role="radio" :aria-checked="chosen?.id === report.id"
            class="flex flex-col gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors"
            :class="chosen?.id === report.id ? 'border-brand-700 bg-brand-50' : 'border-line hover:bg-canvas'"
            :data-testid="`merge-${report.id}`" @click="chosen = report"
          >
            <span class="flex items-center gap-2 text-[13px] font-semibold text-ink">
              {{ report.title }}
              <span class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" :class="statusPill(report.status).classes">{{ statusPill(report.status).label }}</span>
            </span>
            <span class="text-xs text-muted">{{ report.reference }} · {{ report.address_approx ?? 'adresse inconnue' }}</span>
          </button>
        </div>

        <footer class="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" class="h-9 rounded-[10px] border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-neutral-100" @click="emit('close')">Fermer</button>
          <button
            type="button" :disabled="!chosen || saving" data-testid="merge-submit"
            class="h-9 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            @click="chosen && emit('merge', chosen.id)"
          >
            Fusionner
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
