<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Report } from '@/types'
import { CATEGORY_CONFIG } from '@/types'
import StatusBadge from './StatusBadge.vue'
import CategoryIcon from './CategoryIcon.vue'

const props = defineProps<{
  report: Report
}>()

const categoryLabel = computed(() => CATEGORY_CONFIG[props.report.category].label)

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
        <div class="flex flex items-start justify-between gap-2">
          <h3 class="text-sm font-semibold text-dark truncate group-hover:text-primary transition-colors">
            {{ report.title }}
          </h3>
          <StatusBadge :status="report.status" />
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
