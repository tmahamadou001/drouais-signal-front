<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Report } from '@/types'
import { useTenantCategories } from '@/composables/useTenantCategories'
import StatusBadge from './StatusBadge.vue'
import CategoryIcon from './CategoryIcon.vue'

const props = defineProps<{
  report: Report
}>()

const { getCategoryLabel } = useTenantCategories()
const categoryLabel = computed(() => getCategoryLabel(props.report.category))

const formattedDate = computed(() => {
  return new Date(props.report.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})
</script>

<template>
  <RouterLink
    :to="`/signalement/${report.id}`"
    class="block bg-white rounded-ds-lg border border-neutral-200 p-4 hover:shadow-ds-md hover:border-neutral-300 transition-all group"
  >
    <div class="flex items-start gap-3">
      <CategoryIcon :category="report.category" size="md" />
      <div class="flex-1 min-w-0">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <h3 class="text-sm font-semibold text-dark line-clamp-2 group-hover:text-primary transition-colors">
            {{ report.title }}
          </h3>
          <StatusBadge :status="report.status" class="self-start sm:flex-shrink-0" />
        </div>
        <p class="text-xs text-neutral-500 mt-1">
          {{ categoryLabel }}
          <template v-if="report.address_approx"> — {{ report.address_approx }}</template>
        </p>
        <p v-if="report.description" class="text-sm text-neutral-600 mt-1.5 line-clamp-2">
          {{ report.description }}
        </p>
        <p class="text-xs text-neutral-400 mt-2">
          {{ formattedDate }}
        </p>
      </div>
    </div>
  </RouterLink>
</template>
