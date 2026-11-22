<script setup lang="ts">
/**
 * La barre de filtres du tableau, pensée pour tenir quand il y en aura beaucoup.
 *
 * Trois niveaux, du plus fréquent au plus rare :
 *
 *  1. **le statut**, toujours visible — c'est la première question qu'on se pose ;
 *     les deux clôtures sans réparation sont repliées sous « Clos » ;
 *  2. **deux raccourcis qui disent ce qui attend** — « En retard », « Réponse
 *     reçue » — avec leur compte, puis le bouton **Filtres** qui ouvre le reste
 *     (catégorie, période, origine, échange) dans un seul panneau ;
 *  3. **les filtres en vigueur**, en pastilles retirables, sur une ligne qui
 *     n'existe que quand il y en a.
 *
 * Ajouter un filtre, c'est ajouter une ligne au panneau — pas une rangée de plus
 * dans la barre, qui est ce qui la rendait illisible.
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import FiltersPanel from './FiltersPanel.vue'
import ActiveFilterChips, { type ActiveChip } from './ActiveFilterChips.vue'
import { useDismiss } from '@/composables/useDismiss'
import { PERIODS, SORTS } from '@/composables/useReportsList'
import { STATUS_ORDER, CLOSING_STATUSES, STATUS_PILLS } from '@/lib/reportStatus'
import type { ReportStatus } from '@/types'

const props = defineProps<{
  status: ReportStatus | ''
  category: string
  days: number
  overdueOnly: boolean
  /** `received`, `waiting` ou vide. */
  reply: string
  sort: 'recent' | 'oldest' | 'votes'
  categories: { slug: string; label: string }[]
  overdueCount: number
  repliedCount: number
  waitingCount: number
  source: '' | 'citizen' | 'agent'
}>()

const emit = defineEmits<{
  'update:status': [value: ReportStatus | '']
  'update:category': [value: string]
  'update:days': [value: number]
  'update:overdueOnly': [value: boolean]
  'update:reply': [value: string]
  'update:sort': [value: 'recent' | 'oldest' | 'votes']
  'update:source': [value: '' | 'citizen' | 'agent']
  reset: []
}>()

type Menu = 'filters' | 'closed' | 'sort' | null
const open = ref<Menu>(null)
const root = ref<HTMLElement | null>(null)
useDismiss(root, () => { open.value = null })
const toggle = (menu: Exclude<Menu, null>) => { open.value = open.value === menu ? null : menu }

const MAIN_TABS = [
  { value: '' as const, label: 'Tous' },
  ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_PILLS[status].label })),
]
const closedActive = computed(() => (CLOSING_STATUSES as string[]).includes(props.status))

/** Ce que le bouton Filtres compte : ce que le panneau porte, pas les raccourcis. */
const panelCount = computed(() =>
  [props.category !== '', props.days > 0, props.source !== '', props.reply !== ''].filter(Boolean).length
)

const sortLabel = computed(() => SORTS.find((s) => s.value === props.sort)?.label ?? 'Plus récents')

const SOURCE_LABELS = { citizen: 'Habitants', agent: 'Saisis par la mairie' } as const
const REPLY_LABELS: Record<string, string> = { received: 'Réponse reçue', waiting: 'Précision demandée' }

/** Les filtres en vigueur, hors statut (déjà lisible dans les onglets). */
const chips = computed<ActiveChip[]>(() => {
  const list: ActiveChip[] = []
  if (props.category) list.push({ key: 'category', label: props.categories.find((c) => c.slug === props.category)?.label ?? props.category })
  if (props.days > 0) list.push({ key: 'days', label: PERIODS.find((p) => p.days === props.days)?.label ?? `${props.days} j` })
  if (props.source) list.push({ key: 'source', label: SOURCE_LABELS[props.source] })
  if (props.reply) list.push({ key: 'reply', label: REPLY_LABELS[props.reply] ?? props.reply })
  if (props.overdueOnly) list.push({ key: 'overdue', label: 'En retard' })
  if (props.status) list.push({ key: 'status', label: STATUS_PILLS[props.status].label })
  return list
})

function removeChip(key: string) {
  if (key === 'category') emit('update:category', '')
  else if (key === 'days') emit('update:days', 0)
  else if (key === 'source') emit('update:source', '')
  else if (key === 'reply') emit('update:reply', '')
  else if (key === 'overdue') emit('update:overdueOnly', false)
  else if (key === 'status') emit('update:status', '')
}

const tab = (active: boolean) =>
  active ? 'bg-white text-ink shadow-[0_1px_2px_rgba(15,43,74,.10)]' : 'text-muted hover:text-ink'
const quick = (active: boolean) =>
  active ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink hover:bg-canvas'
</script>

<template>
  <div ref="root" class="flex flex-col gap-2.5 px-4 py-3" data-testid="filter-bar">
    <div class="flex flex-wrap items-center gap-2">
      <!-- 1. Le statut : défilable sur un petit écran plutôt que de passer à la ligne -->
      <div class="flex max-w-full flex-none items-center overflow-x-auto rounded-[10px] bg-status-pending-bg p-[3px]" role="tablist" aria-label="Statut">
        <button
          v-for="item in MAIN_TABS" :key="item.value || 'all'" role="tab" :aria-selected="status === item.value"
          class="flex h-8 flex-none items-center rounded-lg px-3.5 text-[13px] font-semibold leading-none transition-colors"
          :class="tab(status === item.value)" :data-testid="`status-${item.value || 'all'}`"
          @click="emit('update:status', item.value)"
        >
          {{ item.label }}
        </button>

        <div class="relative flex-none">
          <button
            class="flex h-8 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold leading-none transition-colors"
            :class="tab(closedActive)" aria-haspopup="listbox" :aria-expanded="open === 'closed'" data-testid="status-closed"
            @click="toggle('closed')"
          >
            {{ closedActive && status ? STATUS_PILLS[status].label : 'Clos' }}
            <AppIcon name="ChevronDown" :size="13" :stroke-width="2" />
          </button>
          <div v-if="open === 'closed'" class="absolute left-0 top-full z-20 mt-1.5 flex w-[200px] flex-col rounded-xl border border-line bg-white py-1 shadow-ds-lg" role="listbox">
            <button
              v-for="closing in CLOSING_STATUSES" :key="closing" role="option" :aria-selected="status === closing"
              class="flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
              :data-testid="`status-${closing}`" @click="emit('update:status', closing); open = null"
            >
              <AppIcon :name="STATUS_PILLS[closing].icon" :size="14" :stroke-width="1.75" class="text-muted" />
              {{ STATUS_PILLS[closing].label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Ce qui attend, et le reste des filtres -->
      <button
        class="flex h-9 flex-none items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-semibold transition-colors" :class="quick(overdueOnly)"
        data-testid="quick-overdue" @click="emit('update:overdueOnly', !overdueOnly)"
      >
        <AppIcon name="AlarmClock" :size="15" :stroke-width="1.75" />
        En retard<span class="tabular-nums" :class="overdueOnly ? '' : 'text-muted'">· {{ overdueCount }}</span>
      </button>
      <button
        v-if="repliedCount > 0 || reply === 'received'"
        class="flex h-9 flex-none items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-semibold transition-colors" :class="quick(reply === 'received')"
        data-testid="quick-replied" @click="emit('update:reply', reply === 'received' ? '' : 'received')"
      >
        <AppIcon name="MessageSquareText" :size="15" :stroke-width="1.75" />
        Réponse reçue<span class="tabular-nums" :class="reply === 'received' ? '' : 'text-muted'">· {{ repliedCount }}</span>
      </button>

      <div class="relative flex-none">
        <button
          class="flex h-9 items-center gap-2 rounded-[10px] border px-3 text-[13px] font-semibold transition-colors" :class="quick(panelCount > 0)"
          aria-haspopup="dialog" :aria-expanded="open === 'filters'" data-testid="open-filters"
          @click="toggle('filters')"
        >
          <AppIcon name="SlidersHorizontal" :size="15" :stroke-width="1.75" />
          Filtres
          <span v-if="panelCount > 0" class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-700 px-1 text-[11px] font-bold tabular-nums text-white" data-testid="filters-count">{{ panelCount }}</span>
        </button>
        <div v-if="open === 'filters'" class="absolute left-0 top-full z-20 mt-1.5 rounded-xl border border-line bg-white shadow-ds-lg" role="dialog" aria-label="Filtres">
          <FiltersPanel
            :category="category" :days="days" :source="source" :reply="reply" :categories="categories"
            :replied-count="repliedCount" :waiting-count="waitingCount"
            @update:category="emit('update:category', $event)" @update:days="emit('update:days', $event)"
            @update:source="emit('update:source', $event)" @update:reply="emit('update:reply', $event)"
          />
        </div>
      </div>

      <!-- Le tri, à droite : un réglage de lecture, pas un filtre -->
      <div class="relative ml-auto flex-none">
        <button
          class="flex h-9 items-center gap-2 rounded-[10px] border border-line px-3 text-[13px] font-medium text-ink transition-colors hover:bg-canvas"
          aria-haspopup="listbox" :aria-expanded="open === 'sort'" data-testid="open-sort" @click="toggle('sort')"
        >
          <AppIcon name="ArrowUpDown" :size="15" :stroke-width="1.75" class="text-muted" />
          {{ sortLabel }}
        </button>
        <div v-if="open === 'sort'" class="absolute right-0 top-full z-20 mt-1.5 flex w-[180px] flex-col rounded-xl border border-line bg-white py-1 shadow-ds-lg" role="listbox">
          <button
            v-for="item in SORTS" :key="item.value" role="option" :aria-selected="sort === item.value"
            class="flex items-center justify-between px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
            :data-testid="`sort-${item.value}`" @click="emit('update:sort', item.value); open = null"
          >
            {{ item.label }}
            <AppIcon v-if="sort === item.value" name="Check" :size="14" :stroke-width="2.5" class="text-brand-700" />
          </button>
        </div>
      </div>
    </div>

    <!-- 3. Les filtres en vigueur -->
    <ActiveFilterChips :chips="chips" @remove="removeChip" @clear="emit('reset')" />
  </div>
</template>
