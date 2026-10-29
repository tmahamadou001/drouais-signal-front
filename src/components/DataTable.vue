<script setup lang="ts" generic="T extends Record<string, any>">
/**
 * La table de données du back-office.
 *
 * Une grille CSS, pas un `<table>`. Le design aligne des lignes de hauteur
 * fixe sur des pistes fixes, et `table-layout` ne sait pas le faire sans se
 * battre contre le contenu : une adresse longue élargissait la colonne et
 * décalait toutes les autres d'une ligne à l'autre.
 *
 * Elle porte **tout le décor de table** — barre de filtres, en-tête de
 * colonnes, barre d'actions groupées, état de chargement, état vide,
 * pagination — parce que c'est précisément ce qui était réécrit, différemment,
 * sur chacun des six écrans qui affichent des données.
 *
 * Ce qu'elle ne fait pas : charger, filtrer, trier. Elle rend ce qu'on lui
 * donne. Le tri et la pagination remontent en événements, et c'est l'écran qui
 * décide si cela se joue sur le serveur ou sur la page courante.
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import AppSkeleton from './ui/AppSkeleton.vue'

export interface DataColumn {
  key: string
  label: string
  /** Piste de grille CSS : `minmax(0,1fr)`, `140px`… Défaut : `minmax(0,1fr)`. */
  width?: string
  align?: 'left' | 'right'
}

const props = withDefaults(defineProps<{
  columns: DataColumn[]
  rows: T[]
  /** Le champ qui identifie une ligne. */
  rowKey: keyof T & string
  selectable?: boolean
  /** Identifiants sélectionnés — `v-model:selected`. */
  selected?: string[]
  loading?: boolean
  /**
   * La ligne dépliée, s'il y en a une.
   *
   * Le détail se rend dans le slot `row-detail`, sous sa ligne et sur toute la
   * largeur : c'est la seule place où il peut respirer sans rogner les colonnes
   * pour tout le monde.
   */
  expandedKey?: string | number | null
  /** Lignes fantômes pendant le chargement. Aligné sur la taille de page. */
  skeletonRows?: number
  emptyMessage?: string
  emptyIcon?: string
  /** Signale une ligne sans la sélectionner : un signalement qui vient d'arriver. */
  highlightRow?: (row: T) => boolean
  /** Pagination. Omise entièrement si `total` n'est pas fourni. */
  page?: number
  pageSize?: number
  total?: number
  /** Le nom de ce qu'on compte : « signalements », « membres »… */
  itemLabel?: string
  /** Le décompte réellement affiché, quand l'écran filtre la page en mémoire. */
  visibleCount?: number
}>(), {
  selectable: false,
  selected: () => [],
  loading: false,
  skeletonRows: 8,
  emptyMessage: 'Aucune donnée à afficher.',
  emptyIcon: 'Inbox',
  itemLabel: 'éléments',
})

const emit = defineEmits<{
  'row-click': [row: T]
  'update:selected': [ids: string[]]
  'page-change': [page: number]
}>()

/**
 * La grille : la case à cocher, puis une piste par colonne.
 *
 * `min-width` plutôt que des points de rupture par colonne : masquer une
 * colonne en grille change le nombre de pistes, et l'en-tête se désaligne des
 * lignes. Sur un écran étroit la table défile, ce qui garde les deux d'accord.
 */
const gridStyle = computed(() => ({
  gridTemplateColumns: [
    props.selectable ? '36px' : null,
    ...props.columns.map((column) => column.width ?? 'minmax(0,1fr)'),
  ].filter(Boolean).join(' '),
}))

const minWidth = computed(() => {
  const fixed = props.columns
    .map((column) => column.width)
    .filter((width): width is string => width !== undefined && width.endsWith('px'))
    .reduce((sum, width) => sum + parseInt(width, 10), 0)

  // Les pistes élastiques ont besoin d'un plancher, sinon elles s'effondrent
  // sur les écrans étroits et le titre devient illisible.
  const flexible = props.columns.filter((column) => !column.width?.endsWith('px')).length

  return `${fixed + flexible * 260 + (props.selectable ? 36 : 0) + 36}px`
})

const selectedSet = computed(() => new Set(props.selected))

const allSelected = computed(
  () => props.rows.length > 0 && props.rows.every((row) => selectedSet.value.has(row[props.rowKey]))
)

function toggleAll() {
  emit('update:selected', allSelected.value ? [] : props.rows.map((row) => row[props.rowKey]))
}

function toggleOne(id: string) {
  emit(
    'update:selected',
    selectedSet.value.has(id)
      ? props.selected.filter((current) => current !== id)
      : [...props.selected, id]
  )
}

const totalPages = computed(() =>
  props.total && props.pageSize ? Math.max(Math.ceil(props.total / props.pageSize), 1) : 1
)

const showPagination = computed(() => props.total !== undefined)

/**
 * « 1 – 15 sur 30 signalements », ou ce qui est vrai quand l'écran filtre lui-même.
 *
 * Le second cas existe pour ne pas mentir : un filtre appliqué en mémoire ne
 * porte que sur la page courante, et afficher « 3 sur 30 » laisserait croire
 * que les 30 ont été cherchés.
 */
const rangeLabel = computed(() => {
  const { page = 1, pageSize = 0, total = 0, visibleCount } = props

  if (visibleCount !== undefined && visibleCount !== props.rows.length) {
    return `${visibleCount} sur ${props.rows.length} affichés · ${total} au total`
  }

  if (total === 0) return `0 ${props.itemLabel}`

  const first = (page - 1) * pageSize + 1
  return `${first} – ${first + props.rows.length - 1} sur ${total} ${props.itemLabel}`
})
</script>

<template>
  <section class="font-ui flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-white">

    <!-- Filtres, propres à chaque écran -->
    <div
      v-if="$slots.toolbar"
      class="flex flex-none flex-wrap items-center gap-2.5 whitespace-nowrap border-b border-line px-[18px] py-3.5"
    >
      <slot name="toolbar" />
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-x-auto">
      <div class="flex min-h-0 flex-1 flex-col" :style="{ minWidth }">

        <!-- En-tête de colonnes -->
        <div
          class="grid h-10 flex-none items-center gap-3 border-b border-line bg-canvas px-[18px]"
          :style="gridStyle"
        >
          <button
            v-if="selectable"
            class="flex h-4 w-4 items-center justify-center rounded-[5px] border-[1.5px] transition-colors"
            :class="allSelected ? 'border-brand-700 bg-brand-700' : 'border-[#C4C8D0] bg-white'"
            :aria-label="allSelected ? 'Tout désélectionner' : 'Tout sélectionner'"
            @click="toggleAll"
          >
            <AppIcon v-if="allSelected" name="Check" :size="12" :stroke-width="3" class="text-white" />
          </button>

          <div
            v-for="column in columns"
            :key="column.key"
            class="min-w-0"
            :class="column.align === 'right' ? 'text-right' : ''"
          >
            <slot :name="`head-${column.key}`">
              <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.06em] text-muted">
                {{ column.label }}
              </span>
            </slot>
          </div>
        </div>

        <!-- Actions groupées, au niveau des lignes qu'elles visent -->
        <div
          v-if="selectable && selected.length > 0 && $slots.bulk"
          class="flex h-12 flex-none items-center gap-2.5 whitespace-nowrap border-b border-brand-100 bg-brand-50 px-[18px]"
        >
          <span class="flex flex-none items-center gap-[7px] text-xs font-semibold leading-none tabular-nums text-brand-900">
            <AppIcon name="CheckCheck" :size="15" :stroke-width="2" class="text-brand-700" />
            {{ selected.length }} sélectionné{{ selected.length > 1 ? 's' : '' }}
          </span>
          <span class="h-[22px] w-px flex-none bg-brand-100" />

          <slot name="bulk" :selected="selected" />

          <button
            class="ml-auto flex flex-none items-center gap-1.5 text-xs font-semibold leading-none text-brand-700 hover:underline"
            @click="emit('update:selected', [])"
          >
            <AppIcon name="X" :size="14" :stroke-width="2" />
            Désélectionner
          </button>
        </div>

        <!-- Lignes -->
        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <template v-if="loading">
            <div
              v-for="index in skeletonRows"
              :key="`skeleton-${index}`"
              class="grid h-16 items-center gap-3 border-b border-hairline px-[18px]"
              :style="gridStyle"
            >
              <AppSkeleton v-if="selectable" class="h-4 w-4 rounded-[5px]" />
              <AppSkeleton v-for="column in columns" :key="column.key" class="h-3 rounded" />
            </div>
          </template>

          <template v-for="row in rows" v-else :key="row[rowKey]">
          <div
            :id="`row-${row[rowKey]}`"
            class="relative grid h-16 items-center gap-3 border-b border-hairline px-[18px] transition-colors"
            :class="[
              selectedSet.has(row[rowKey])
                ? 'bg-brand-50'
                : highlightRow?.(row) ? 'bg-status-done-bg' : 'hover:bg-canvas',
              $attrs.onRowClick !== undefined ? 'cursor-pointer' : '',
            ]"
            :style="gridStyle"
            @click="emit('row-click', row)"
          >
            <span
              v-if="selectedSet.has(row[rowKey])"
              class="absolute inset-y-0 left-0 w-[3px] bg-brand-700"
            />

            <button
              v-if="selectable"
              class="flex h-4 w-4 items-center justify-center rounded-[5px] border-[1.5px] transition-colors"
              :class="selectedSet.has(row[rowKey]) ? 'border-brand-700 bg-brand-700' : 'border-[#C4C8D0] bg-white'"
              aria-label="Sélectionner cette ligne"
              @click.stop="toggleOne(row[rowKey])"
            >
              <AppIcon
                v-if="selectedSet.has(row[rowKey])"
                name="Check" :size="12" :stroke-width="3" class="text-white"
              />
            </button>

            <div
              v-for="column in columns"
              :key="column.key"
              class="min-w-0"
              :class="column.align === 'right' ? 'flex justify-end' : ''"
            >
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                <span class="truncate text-[13px] font-medium leading-none text-ink">
                  {{ row[column.key] }}
                </span>
              </slot>
            </div>
          </div>

            <slot
              v-if="expandedKey !== undefined && expandedKey !== null && row[rowKey] === expandedKey"
              name="row-detail"
              :row="row"
            />
          </template>

          <div
            v-if="!loading && rows.length === 0"
            class="flex flex-1 flex-col items-center justify-center gap-3 py-16"
          >
            <slot name="empty">
              <div class="flex h-12 w-12 items-center justify-center rounded-[14px] bg-canvas">
                <AppIcon :name="emptyIcon" :size="22" class="text-faint" />
              </div>
              <p class="text-sm text-muted">{{ emptyMessage }}</p>
            </slot>
          </div>
        </div>
      </div>
    </div>

    <!-- Pied : la pagination, et rien d'autre -->
    <div
      v-if="showPagination"
      class="flex h-12 flex-none items-center gap-3 whitespace-nowrap border-t border-line bg-white px-[18px]"
    >
      <span class="flex-none text-xs font-medium leading-none tabular-nums text-muted">
        {{ rangeLabel }}
      </span>
      <div class="ml-auto flex flex-none items-center gap-2">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-line transition-colors hover:bg-canvas disabled:cursor-not-allowed"
          :disabled="(page ?? 1) <= 1"
          aria-label="Page précédente"
          @click="emit('page-change', (page ?? 1) - 1)"
        >
          <AppIcon
            name="ChevronLeft" :size="16" :stroke-width="2"
            :class="(page ?? 1) <= 1 ? 'text-[#C4C8D0]' : 'text-brand-900'"
          />
        </button>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-line transition-colors hover:bg-canvas disabled:cursor-not-allowed"
          :disabled="(page ?? 1) >= totalPages"
          aria-label="Page suivante"
          @click="emit('page-change', (page ?? 1) + 1)"
        >
          <AppIcon
            name="ChevronRight" :size="16" :stroke-width="2"
            :class="(page ?? 1) >= totalPages ? 'text-[#C4C8D0]' : 'text-brand-900'"
          />
        </button>
      </div>
    </div>
  </section>
</template>
