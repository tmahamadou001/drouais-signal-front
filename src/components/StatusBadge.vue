<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_CONFIG, type ReportStatus } from '@/types'

const props = defineProps<{
  status: ReportStatus
}>()

const config = computed(() => STATUS_CONFIG[props.status])
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
