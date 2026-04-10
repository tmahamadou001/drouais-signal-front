<script setup lang="ts">
import { computed } from 'vue'
import { useReportStatuses } from '@/composables/useReportStatuses'

const props = defineProps<{
  status: string
}>()

const { getStatusConfig } = useReportStatuses()
const config = computed(() => getStatusConfig(props.status))
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
    :class="[config.tailwindBg, config.tailwindText]"
  >
    <span
      class="w-1.5 h-1.5 rounded-full"
      :style="{ backgroundColor: config.dotColor }"
    />
    {{ config.label }}
  </span>
</template>
