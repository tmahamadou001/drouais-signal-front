<script setup lang="ts">
import { computed } from 'vue'

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

const checkboxClasses = computed(() => {
  const sizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }
  
  return [
    sizes[props.size],
    'rounded border-neutral-300 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2',
    'transition-colors cursor-pointer',
    props.disabled ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ')
})

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <label class="inline-flex items-center gap-2 cursor-pointer select-none">
    <input
      type="checkbox"
      :checked="modelValue"
      :indeterminate="indeterminate"
      :disabled="disabled"
      :class="checkboxClasses"
      @change="handleChange"
    />
    <span v-if="label" class="text-sm text-neutral-700">{{ label }}</span>
    <slot />
  </label>
</template>
