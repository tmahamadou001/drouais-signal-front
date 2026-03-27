<script setup lang="ts">
const props = defineProps<{
  currentStep: 1 | 2 | 3 | 4
}>()

const steps = [
  { number: 1, label: 'Photo' },
  { number: 2, label: 'Analyse' },
  { number: 3, label: 'Vérification' },
  { number: 4, label: 'Localisation' },
]

function getStepStatus(stepNumber: number) {
  if (stepNumber < props.currentStep) return 'completed'
  if (stepNumber === props.currentStep) return 'current'
  return 'future'
}
</script>

<template>
  <div class="w-full max-w-2xl mx-auto px-4 py-4">
    <div class="relative">
      <!-- Ligne de connexion -->
      <div class="absolute top-4 left-0 right-0 h-0.5 bg-neutral-200">
        <div
          class="h-full bg-primary transition-all duration-500"
          :style="{ width: `${((currentStep - 1) / 3) * 100}%` }"
        />
      </div>

      <!-- Points et labels -->
      <div class="relative flex justify-between">
        <div
          v-for="step in steps"
          :key="step.number"
          class="flex flex-col items-center"
        >
          <!-- Point -->
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 relative z-10"
            :class="{
              'bg-green-500 text-white': getStepStatus(step.number) === 'completed',
              'bg-primary text-white ring-4 ring-primary/20': getStepStatus(step.number) === 'current',
              'bg-white border-2 border-neutral-300 text-neutral-400': getStepStatus(step.number) === 'future',
            }"
          >
            <svg
              v-if="getStepStatus(step.number) === 'completed'"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else>{{ step.number }}</span>
          </div>

          <!-- Label -->
          <span
            class="mt-2 text-xs font-medium transition-colors duration-300"
            :class="{
              'text-green-600': getStepStatus(step.number) === 'completed',
              'text-primary': getStepStatus(step.number) === 'current',
              'text-neutral-400': getStepStatus(step.number) === 'future',
            }"
          >
            {{ step.label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
