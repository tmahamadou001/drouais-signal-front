<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  text: string
  maxLength?: number
  lines?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxLength: 100,
  lines: 1,
})

const showTooltip = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })

const isTruncated = computed(() => {
  return props.text.length > props.maxLength
})

const displayText = computed(() => {
  if (!isTruncated.value) return props.text
  return props.text.slice(0, props.maxLength) + '...'
})

const handleMouseEnter = (event: MouseEvent) => {
  if (isTruncated.value) {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    tooltipPosition.value = {
      x: rect.left,
      y: rect.bottom + 8,
    }
    showTooltip.value = true
  }
}

const handleMouseLeave = () => {
  showTooltip.value = false
}
</script>

<template>
  <div class="relative inline-block">
    <span
      :class="[
        'cursor-help',
        lines === 1 ? 'truncate block' : `line-clamp-${lines}`,
      ]"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      {{ displayText }}
    </span>

    <!-- Tooltip -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showTooltip && isTruncated"
          class="fixed z-50 max-w-md px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg break-words"
          :style="{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }"
        >
          {{ text }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
