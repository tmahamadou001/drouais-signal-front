<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

interface Props {
  modelValue: boolean
  indeterminate?: boolean
  disabled?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  indeterminate: false,
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const sizeConfig = computed(() => ({
  sm: { box: 'w-3.5 h-3.5 rounded', icon: 'w-2 h-2', dash: 'w-1.5 h-px' },
  md: { box: 'w-4 h-4 rounded-[4px]', icon: 'w-2.5 h-2.5', dash: 'w-2 h-0.5' },
  lg: { box: 'w-5 h-5 rounded-md', icon: 'w-3 h-3', dash: 'w-2.5 h-0.5' },
}[props.size]))

const isChecked = computed(
  () => props.modelValue && !props.indeterminate
)
const isIndeterminate = computed(
  () => props.indeterminate
)
const isActive = computed(
  () => props.modelValue || props.indeterminate
)

const handleClick = () => {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <label
    class="inline-flex items-center gap-2
           select-none"
    :class="disabled
      ? 'cursor-not-allowed opacity-50'
      : 'cursor-pointer'"
    @click.prevent="handleClick"
  >
    <!-- Custom checkbox -->
    <div
      :class="[
        sizeConfig.box,
        'flex-shrink-0 flex items-center justify-center',
        'border transition-all duration-150',
        isActive
          ? 'bg-primary border-primary'
          : 'bg-white border-gray-300',
        !disabled && !isActive
          ? 'hover:border-primary'
          : '',
      ]"
    >
      <AppIcon v-if="isChecked" name="Check" :class="sizeConfig.icon" :stroke-width="3" class="text-white" />

      <div
        v-else-if="isIndeterminate"
        :class="[sizeConfig.dash, 'bg-white rounded-full']"
      />
    </div>

    <!-- Input hidden for accessibility -->
    <input
      type="checkbox"
      class="sr-only"
      :checked="modelValue"
      :indeterminate="indeterminate"
      :disabled="disabled"
      @change="handleClick"
    />

    <!-- Label -->
    <span
      v-if="label"
      class="text-sm text-gray-700 leading-none"
    >
      {{ label }}
    </span>
    <slot />
  </label>
</template>