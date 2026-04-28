<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'

export interface ButtonAction {
  label: string
  icon?: string
  variant?: 'default' | 'danger' | 'warning' | 'success'
  disabled?: boolean
  onClick: () => void
}

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'ghost'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  icon?: string
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  loading?: boolean
  actions?: ButtonAction[]
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  iconPosition: 'left',
  disabled: false,
  loading: false,
  block: false,
})

const emit = defineEmits<{
  click: []
}>()

const menuOpen = ref(false)
const buttonRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLDivElement | null>(null)
const menuPosition = ref({ top: '0px', left: '0px' })

const buttonClasses = computed(() => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-ds font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  
  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-600',
    secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    warning: 'bg-warning-50 text-warning-700 hover:bg-warning-100',
    success: 'bg-success-50 text-success-700 hover:bg-success-100',
    ghost: 'text-neutral-500 hover:bg-neutral-100',
  }
  
  return [
    base,
    sizes[props.size],
    variants[props.variant],
    props.block ? 'w-full' : '',
  ].join(' ')
})

const getActionClasses = (action: ButtonAction) => {
  const variants = {
    default: 'text-neutral-700 hover:bg-neutral-50',
    danger: 'text-red-600 hover:bg-red-50',
    warning: 'text-warning-700 hover:bg-warning-50',
    success: 'text-success-700 hover:bg-success-50',
  }
  
  const disabledClass = action.disabled ? 'opacity-50 cursor-not-allowed' : ''
  
  return `w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${variants[action.variant || 'default']} ${disabledClass}`
}

const handleClick = async (event: MouseEvent) => {
  if (props.actions && props.actions.length > 0) {
    menuOpen.value = !menuOpen.value
    if (menuOpen.value) {
      await nextTick()
      updateMenuPosition(event.currentTarget as HTMLElement)
    }
  } else {
    emit('click')
  }
}

const updateMenuPosition = (button: HTMLElement) => {
  const rect = button.getBoundingClientRect()
  const menuWidth = 192
  const menuHeight = menuRef.value?.offsetHeight || 200
  
  let top = rect.bottom + 4
  let left = rect.right - menuWidth
  
  if (left < 8) {
    left = 8
  }
  
  if (top + menuHeight > window.innerHeight) {
    top = rect.top - menuHeight - 4
  }
  
  menuPosition.value = {
    top: `${top}px`,
    left: `${left}px`,
  }
}

const handleActionClick = (action: ButtonAction) => {
  if (action.disabled) return
  action.onClick()
  menuOpen.value = false
}

const closeMenu = () => {
  menuOpen.value = false
}
</script>

<template>
  <div class="relative inline-block">
    <button
      ref="buttonRef"
      :class="buttonClasses"
      :disabled="disabled || loading"
      @click="handleClick"
    >
      <AppIcon
        v-if="icon && iconPosition === 'left' && !loading"
        :name="icon"
        :size="size === 'xs' ? 14 : size === 'lg' ? 20 : 16"
      />
      
      <svg
        v-if="loading"
        class="animate-spin h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
      
      <span v-if="loading">Chargement...</span>
      <slot v-else />
      
      <AppIcon
        v-if="icon && iconPosition === 'right' && !loading"
        :name="icon"
        :size="size === 'xs' ? 14 : size === 'lg' ? 20 : 16"
      />
      
      <svg
        v-if="actions && actions.length > 0"
        class="w-4 h-4 ml-1"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
    </button>
    
    <!-- Dropdown Menu -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="menuOpen && actions && actions.length > 0"
          ref="menuRef"
          class="fixed min-w-[12rem] bg-white rounded-ds-lg shadow-xl border border-neutral-200 py-1 z-50"
          :style="menuPosition"
          @click.stop
        >
        <button
          v-for="(action, index) in actions"
          :key="index"
          :class="getActionClasses(action)"
          :disabled="action.disabled"
          @click="handleActionClick(action)"
        >
          <AppIcon v-if="action.icon" :name="action.icon" :size="16" />
          {{ action.label }}
        </button>
      </div>
    </Transition>
    </Teleport>
    
    <!-- Backdrop to close menu -->
    <div
      v-if="menuOpen"
      class="fixed inset-0 z-40"
      @click.stop="closeMenu"
    />
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
