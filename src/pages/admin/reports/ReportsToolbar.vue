<script setup lang="ts">
/**
 * La barre de filtres du tableau : statut, catégorie, période, retard, tri.
 *
 * Les trois menus déroulants partagent un seul état ouvert : en ouvrir un
 * referme les autres, sinon ils se recouvrent. Le clic extérieur est géré par
 * la page, qui est le seul endroit à voir tout l'écran.
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { PERIODS, SORTS } from '@/composables/useReportsList'
import { STATUS_ORDER, STATUS_PILLS } from '@/lib/reportStatus'
import type { ReportStatus } from '@/types'

const props = defineProps<{
  status: ReportStatus | ''
  category: string
  days: number
  overdueOnly: boolean
  sort: 'recent' | 'oldest' | 'votes'
  categories: { slug: string; label: string }[]
  overdueCount: number
  categoryLabel: string
  source: '' | 'citizen' | 'agent'
}>()

const emit = defineEmits<{
  'update:status': [value: ReportStatus | '']
  'update:category': [value: string]
  'update:days': [value: number]
  'update:overdueOnly': [value: boolean]
  'update:sort': [value: 'recent' | 'oldest' | 'votes']
  'update:source': [value: '' | 'citizen' | 'agent']
}>()

type Menu = 'category' | 'period' | 'sort' | 'source' | null
const openMenu = ref<Menu>(null)

function toggle(menu: Exclude<Menu, null>) {
  openMenu.value = openMenu.value === menu ? null : menu
}

const STATUS_TABS = [
  { value: '' as const, label: 'Tous' },
  ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_PILLS[status].label })),
]

const periodLabel = computed(() => PERIODS.find((p) => p.days === props.days)?.label ?? 'Toute période')
const sortLabel = computed(() => SORTS.find((s) => s.value === props.sort)?.label ?? 'Plus récents')

/**
 * D'où vient le signalement.
 *
 * « Mairie » plutôt que « agent » : c'est le mot de l'écran, et l'habitant
 * n'est pas « citoyen » non plus dans la bouche d'un agent.
 */
const SOURCES = [
  { value: '' as const,        label: 'Toutes origines' },
  { value: 'citizen' as const, label: 'Habitants' },
  { value: 'agent' as const,   label: 'Saisis par la mairie' },
]

const sourceLabel = computed(
  () => SOURCES.find((item) => item.value === props.source)?.label ?? 'Toutes origines'
)

/** Fermer les menus depuis la page, au clic extérieur. */
defineExpose({ closeMenus: () => { openMenu.value = null } })
</script>

<template>
  <div class="flex flex-none rounded-[10px] bg-status-pending-bg p-[3px]">
    <button
      v-for="tab in STATUS_TABS"
      :key="tab.value || 'all'"
      class="flex h-8 flex-none items-center rounded-lg px-3.5 text-[13px] font-semibold leading-none transition-colors"
      :class="status === tab.value
        ? 'bg-white text-ink shadow-[0_1px_2px_rgba(15,43,74,.10)]'
        : 'text-muted hover:text-ink'"
      @click="emit('update:status', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>

  <!-- Catégories -->
  <div class="relative flex-none" @click.stop>
    <button
      class="flex h-[38px] items-center gap-2 rounded-[10px] border px-3 transition-colors"
      :class="category ? 'border-brand-100 bg-brand-50' : 'border-line hover:bg-canvas'"
      @click="toggle('category')"
    >
      <AppIcon name="Tag" :size="15" :stroke-width="1.75" :class="category ? 'text-brand-700' : 'text-muted'" />
      <span class="text-[13px] font-medium leading-none" :class="category ? 'text-brand-700' : 'text-ink'">
        {{ categoryLabel }}
      </span>
      <AppIcon name="ChevronDown" :size="15" :stroke-width="2" class="text-muted" />
    </button>
    <div
      v-if="openMenu === 'category'"
      class="absolute left-0 top-[42px] z-20 max-h-72 w-60 overflow-y-auto rounded-[10px] border border-line bg-white py-1 shadow-lg"
    >
      <button
        class="flex w-full items-center px-3 py-2 text-left text-[13px] text-ink hover:bg-canvas"
        @click="emit('update:category', ''); openMenu = null"
      >
        Toutes les catégories
      </button>
      <button
        v-for="item in categories"
        :key="item.slug"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-canvas"
        :class="category === item.slug ? 'font-semibold text-brand-700' : 'text-ink'"
        @click="emit('update:category', item.slug); openMenu = null"
      >
        {{ item.label }}
      </button>
    </div>
  </div>

  <!-- Période -->
  <div class="relative flex-none" @click.stop>
    <button
      class="flex h-[38px] items-center gap-2 rounded-[10px] border border-line px-3 transition-colors hover:bg-canvas"
      @click="toggle('period')"
    >
      <AppIcon name="Calendar" :size="15" :stroke-width="1.75" class="text-muted" />
      <span class="text-[13px] font-medium leading-none tabular-nums text-ink">{{ periodLabel }}</span>
      <AppIcon name="ChevronDown" :size="15" :stroke-width="2" class="text-muted" />
    </button>
    <div
      v-if="openMenu === 'period'"
      class="absolute left-0 top-[42px] z-20 w-40 rounded-[10px] border border-line bg-white py-1 shadow-lg"
    >
      <button
        v-for="period in PERIODS"
        :key="period.days"
        class="flex w-full px-3 py-2 text-left text-[13px] hover:bg-canvas"
        :class="days === period.days ? 'font-semibold text-brand-700' : 'text-ink'"
        @click="emit('update:days', period.days); openMenu = null"
      >
        {{ period.label }}
      </button>
    </div>
  </div>

  <!-- Origine -->
  <div class="relative flex-none" @click.stop>
    <button
      class="flex h-[38px] items-center gap-2 rounded-[10px] border px-3 transition-colors"
      :class="source ? 'border-brand-100 bg-brand-50' : 'border-line hover:bg-canvas'"
      @click="toggle('source')"
    >
      <AppIcon name="Landmark" :size="15" :stroke-width="1.75"
        :class="source ? 'text-brand-700' : 'text-muted'" />
      <span class="text-[13px] font-medium leading-none" :class="source ? 'text-brand-700' : 'text-ink'">
        {{ sourceLabel }}
      </span>
      <AppIcon name="ChevronDown" :size="15" :stroke-width="2" :class="source ? 'text-brand-700' : 'text-muted'" />
    </button>
    <div
      v-if="openMenu === 'source'"
      class="absolute left-0 top-[42px] z-20 w-52 rounded-[10px] border border-line bg-white py-1 shadow-lg"
    >
      <button
        v-for="item in SOURCES"
        :key="item.value || 'all'"
        class="flex w-full px-3 py-2 text-left text-[13px] hover:bg-canvas"
        :class="source === item.value ? 'font-semibold text-brand-700' : 'text-ink'"
        @click="emit('update:source', item.value); openMenu = null"
      >
        {{ item.label }}
      </button>
    </div>
  </div>

  <!-- En retard : un filtre, pas une décoration -->
  <button
    class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] border px-3 transition-colors"
    :class="overdueOnly ? 'border-brand-100 bg-brand-50' : 'border-line hover:bg-canvas'"
    @click="emit('update:overdueOnly', !overdueOnly)"
  >
    <AppIcon name="AlarmClock" :size="15" :stroke-width="1.75" :class="overdueOnly ? 'text-brand-700' : 'text-muted'" />
    <span
      class="text-[13px] font-semibold leading-none tabular-nums"
      :class="overdueOnly ? 'text-brand-700' : 'text-ink'"
    >
      En retard · {{ overdueCount }}
    </span>
  </button>

  <!-- Tri -->
  <div class="relative ml-auto flex-none" @click.stop>
    <button
      class="flex h-[38px] items-center gap-2 rounded-[10px] border border-line px-3 transition-colors hover:bg-canvas"
      @click="toggle('sort')"
    >
      <AppIcon name="ArrowUpDown" :size="15" :stroke-width="1.75" class="text-muted" />
      <span class="text-[13px] font-medium leading-none text-ink">{{ sortLabel }}</span>
    </button>
    <div
      v-if="openMenu === 'sort'"
      class="absolute right-0 top-[42px] z-20 w-44 rounded-[10px] border border-line bg-white py-1 shadow-lg"
    >
      <button
        v-for="option in SORTS"
        :key="option.value"
        class="flex w-full px-3 py-2 text-left text-[13px] hover:bg-canvas"
        :class="sort === option.value ? 'font-semibold text-brand-700' : 'text-ink'"
        @click="emit('update:sort', option.value); openMenu = null"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
