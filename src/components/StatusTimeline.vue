<script setup lang="ts">
import { computed } from 'vue'
import type { ReportStatus, StatusHistoryEntry } from '@/types'
import { useReportStatuses } from '@/composables/useReportStatuses'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{
  currentStatus: ReportStatus
  history?: StatusHistoryEntry[]
}>()

const { getTimelineSteps } = useReportStatuses()
const steps = getTimelineSteps()

const statusIndex = computed(() => {
  return steps.findIndex(s => s.key === props.currentStatus)
})

const getStepDate = (stepKey: ReportStatus): string | null => {
  if (!props.history) return null
  const entry = props.history.find(h => h.new_status === stepKey)
  if (!entry) return null
  return new Date(entry.changed_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isStepComplete = (index: number): boolean => {
  return index <= statusIndex.value
}

const isStepCurrent = (index: number): boolean => {
  return index === statusIndex.value
}
</script>

<template>
  <div class="flex items-start gap-0">
    <div
      v-for="(step, index) in steps"
      :key="step.key"
      class="flex-1 flex flex-col items-center relative"
    >
      <!-- Connecting line (before) -->
      <div
        v-if="index > 0"
        class="absolute top-4 right-1/2 w-full h-0.5"
        :class="isStepComplete(index) ? 'bg-success' : 'bg-neutral-200'"
      />

      <!-- Circle -->
      <div
        class="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
        :class="[
          isStepComplete(index) && !isStepCurrent(index)
            ? 'bg-success text-white shadow-md'
            : '',
          isStepCurrent(index)
            ? `${step.bgColor} text-white shadow-lg ring-4 ${step.ringColor}`
            : '',
          !isStepComplete(index)
            ? 'bg-neutral-200 text-neutral-400'
            : '',
        ]"
      >
        <template v-if="isStepComplete(index) && !isStepCurrent(index)">
          <AppIcon name="Check" :size="16" />
        </template>
        <template v-else>
          <AppIcon :name="step.icon" :size="16" />
        </template>
      </div>

      <!-- Label -->
      <p
        class="mt-2 text-xs font-medium text-center"
        :class="isStepComplete(index) ? 'text-dark' : 'text-neutral-400'"
      >
        {{ step.label }}
      </p>

      <!-- Date -->
      <p
        v-if="getStepDate(step.key)"
        class="text-[10px] text-neutral-400 mt-0.5 text-center"
      >
        {{ getStepDate(step.key) }}
      </p>
    </div>
  </div>
</template>
