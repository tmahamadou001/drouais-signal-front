<script setup lang="ts">
/**
 * Le détail par service, et, en dépliant, par catégorie.
 *
 * Un service se lit sur quatre chiffres : ce qu'il a, ce qui est en retard, le
 * temps qu'il met, et s'il tient son délai. En dessous de trois résolutions
 * chronométrées, un taux ne veut rien dire — « À suivre », pas « Critique » :
 * ce n'est pas un mauvais résultat, c'est une absence de résultat (même règle que
 * la table des catégories). « Sans service » est une ligne comme les autres : c'est
 * le travail que personne n'a encore confié.
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { formatDelay } from '@/lib/delays'
import type { ServiceCategoryRow, ServiceRow } from '@/composables/useTreatmentStats'

const props = defineProps<{ services: ServiceRow[]; categories: ServiceCategoryRow[] }>()

const MIN_SAMPLE = 3
const expanded = ref<string | null>(null)
const keyOf = (id: string | null) => id ?? 'none'

const categoriesOf = (serviceId: string | null) =>
  props.categories.filter((row) => row.service_id === serviceId)

const rows = computed(() =>
  props.services.map((service) => ({ service, key: keyOf(service.service_id), categories: categoriesOf(service.service_id) }))
)

function toggle(key: string) {
  expanded.value = expanded.value === key ? null : key
}

function status(measured: number, rate: number | null): { label: string; classes: string } {
  if (measured < MIN_SAMPLE || rate === null) return { label: 'À suivre', classes: 'bg-status-pending-bg text-status-pending-fg' }
  if (rate >= 80) return { label: `${rate} %`, classes: 'bg-status-done-bg text-status-done-fg' }
  if (rate >= 60) return { label: `${rate} %`, classes: 'bg-status-progress-bg text-status-progress-fg' }
  return { label: `${rate} %`, classes: 'bg-status-danger-bg text-status-danger' }
}
</script>

<template>
  <section class="flex flex-none flex-col gap-3.5 rounded-[14px] border border-line bg-white p-5" data-testid="service-breakdown">
    <header class="flex flex-col gap-1">
      <h2 class="text-[15px] font-bold text-brand-900">Détail par service et catégorie</h2>
      <p class="text-xs leading-[1.4] text-muted">
        Dépliez un service pour voir ses catégories. Les délais ne portent que sur les signalements d’habitants.
      </p>
    </header>

    <p v-if="rows.length === 0" class="py-4 text-center text-[13px] text-muted" data-testid="breakdown-empty">
      Aucun signalement sur la période.
    </p>

    <div v-else class="flex flex-col">
      <div class="grid grid-cols-[1fr_72px_72px_72px_96px_88px] items-center gap-2 border-b border-line pb-2 text-[11px] font-semibold tracking-[0.08em] text-muted">
        <span>SERVICE</span><span class="text-right">TOTAL</span><span class="text-right">EN COURS</span><span class="text-right">EN RETARD</span><span class="text-right">DÉLAI MOYEN</span><span class="text-right">RESPECT</span>
      </div>

      <template v-for="row in rows" :key="row.key">
        <button
          class="grid grid-cols-[1fr_72px_72px_72px_96px_88px] items-center gap-2 border-b border-line py-2.5 text-left transition-colors hover:bg-canvas"
          :aria-expanded="expanded === row.key" :data-testid="`service-${row.key}`" @click="toggle(row.key)"
        >
          <span class="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink">
            <AppIcon :name="expanded === row.key ? 'ChevronDown' : 'ChevronRight'" :size="14" :stroke-width="2" class="flex-none text-muted" />
            <span class="h-2.5 w-2.5 flex-none rounded-full" :style="{ backgroundColor: row.service.service_color ?? '#A3A3A3' }" />
            <span class="truncate">{{ row.service.service_name }}</span>
          </span>
          <span class="text-right text-[13px] tabular-nums text-ink">{{ row.service.report_count }}</span>
          <span class="text-right text-[13px] tabular-nums text-ink">{{ row.service.open_count }}</span>
          <span class="text-right text-[13px] font-semibold tabular-nums" :class="row.service.overdue_count > 0 ? 'text-status-danger' : 'text-muted'">{{ row.service.overdue_count }}</span>
          <span class="text-right text-[13px] tabular-nums text-ink">{{ formatDelay(row.service.avg_resolve_hours) }}</span>
          <span class="flex justify-end">
            <span class="rounded-md px-2 py-1 text-[11px] font-semibold leading-none" :class="status(row.service.measured_count, row.service.sla_compliance_rate).classes">
              {{ status(row.service.measured_count, row.service.sla_compliance_rate).label }}
            </span>
          </span>
        </button>

        <template v-if="expanded === row.key">
          <div
            v-for="category in row.categories" :key="category.category"
            class="grid grid-cols-[1fr_72px_72px_72px_96px_88px] items-center gap-2 border-b border-line bg-canvas py-2 pl-9 text-[12px]"
            data-testid="category-row"
          >
            <span class="truncate font-medium text-ink">{{ category.category_label }}</span>
            <span class="text-right tabular-nums text-muted">{{ category.report_count }}</span>
            <span class="text-right tabular-nums text-muted">{{ category.open_count }}</span>
            <span class="text-right tabular-nums" :class="category.overdue_count > 0 ? 'font-semibold text-status-danger' : 'text-muted'">{{ category.overdue_count }}</span>
            <span class="text-right tabular-nums text-muted">{{ formatDelay(category.avg_resolve_hours) }}</span>
            <span class="flex justify-end">
              <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none" :class="status(category.measured_count, category.sla_compliance_rate).classes">
                {{ status(category.measured_count, category.sla_compliance_rate).label }}
              </span>
            </span>
          </div>
        </template>
      </template>
    </div>
  </section>
</template>
