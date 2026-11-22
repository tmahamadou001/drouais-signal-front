<script setup lang="ts">
/**
 * Quelle vue de la liste : mes signalements, ou plus large.
 *
 * Trois vues fixes — « Mon périmètre », « Toute la commune », « Sans responsable » —
 * et un menu « Services » qui porte tout le reste : chaque service, et ce qui est
 * confié à l'extérieur. Une ligne d'onglets par service ne tient plus dès qu'une
 * commune en a six ; un menu, lui, passe à cinquante.
 *
 * La valeur affichée est celle que le serveur **a appliquée**, jamais celle qu'on
 * avait demandée : tant que rien n'est choisi, le serveur décide (toute la commune
 * pour qui n'a encore rien en propre), et l'écran doit le dire.
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useDismiss } from '@/composables/useDismiss'
import type { TenantService } from '@/types/team'

const props = defineProps<{
  /** Le périmètre réellement appliqué. */
  applied: string
  services: TenantService[]
  unassignedCount: number
}>()

const emit = defineEmits<{ 'update:scope': [value: string] }>()

const CORE = computed(() => [
  { value: 'mine', label: 'Mon périmètre', badge: 0 },
  { value: 'all', label: 'Toute la commune', badge: 0 },
  { value: 'unassigned', label: 'Sans responsable', badge: props.unassignedCount },
])

const open = ref(false)
const root = ref<HTMLElement | null>(null)
useDismiss(root, () => { open.value = false })

const inMenu = computed(() => props.applied === 'external' || props.applied.startsWith('service:'))
const activeService = computed(() => props.services.find((service) => `service:${service.id}` === props.applied) ?? null)
const menuLabel = computed(() => {
  if (props.applied === 'external') return 'Confiés à l’extérieur'
  return activeService.value?.name ?? 'Services'
})

function pick(value: string) {
  open.value = false
  emit('update:scope', value)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Périmètre" data-testid="scope-selector">
    <button
      v-for="option in CORE" :key="option.value"
      role="tab" :aria-selected="applied === option.value"
      class="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors"
      :class="applied === option.value ? 'bg-brand-900 text-white' : 'bg-canvas text-muted hover:text-ink'"
      :data-testid="`scope-${option.value}`"
      @click="pick(option.value)"
    >
      {{ option.label }}
      <span
        v-if="option.badge"
        class="rounded-full px-1.5 text-[11px] font-bold tabular-nums"
        :class="applied === option.value ? 'bg-white/20 text-white' : 'bg-status-progress-dot text-brand-900'"
      >
        {{ option.badge }}
      </span>
    </button>

    <div ref="root" class="relative">
      <button
        class="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors"
        :class="inMenu ? 'bg-brand-900 text-white' : 'bg-canvas text-muted hover:text-ink'"
        aria-haspopup="listbox" :aria-expanded="open" data-testid="scope-services"
        @click="open = !open"
      >
        <span v-if="activeService" class="h-2 w-2 rounded-full bg-neutral-300" :style="activeService.color ? { backgroundColor: activeService.color } : {}" />
        <AppIcon v-else name="Network" :size="14" :stroke-width="1.75" />
        {{ menuLabel }}
        <AppIcon name="ChevronDown" :size="14" :stroke-width="2" />
      </button>

      <div
        v-if="open"
        class="absolute left-0 top-full z-20 mt-1.5 flex max-h-[320px] w-[260px] flex-col overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-ds-lg"
        role="listbox" data-testid="scope-menu"
      >
        <button
          v-for="service in services" :key="service.id" role="option" :aria-selected="applied === `service:${service.id}`"
          class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
          :data-testid="`scope-service:${service.id}`" @click="pick(`service:${service.id}`)"
        >
          <span class="h-2.5 w-2.5 flex-none rounded-full bg-neutral-300" :style="service.color ? { backgroundColor: service.color } : {}" />
          <span class="flex-1 truncate">{{ service.name }}</span>
          <AppIcon v-if="applied === `service:${service.id}`" name="Check" :size="14" :stroke-width="2.5" class="text-brand-700" />
        </button>
        <p v-if="services.length === 0" class="px-3 py-2 text-xs text-muted">Aucun service créé.</p>
        <div class="my-1 border-t border-line" />
        <button
          role="option" :aria-selected="applied === 'external'"
          class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
          data-testid="scope-external" @click="pick('external')"
        >
          <AppIcon name="Truck" :size="14" :stroke-width="1.75" class="flex-none text-muted" />
          <span class="flex-1">Confiés à l’extérieur</span>
          <AppIcon v-if="applied === 'external'" name="Check" :size="14" :stroke-width="2.5" class="text-brand-700" />
        </button>
      </div>
    </div>
  </div>
</template>
