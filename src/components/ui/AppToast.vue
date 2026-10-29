<script setup lang="ts">
/**
 * Un message éphémère, et la barre qui montre le temps qu'il lui reste.
 *
 * La barre n'est pas une décoration : sans elle, un message qui disparaît tout
 * seul donne l'impression d'avoir été raté. Elle est purement CSS — une
 * animation de `transform`, donc composée par le navigateur, et rien qui
 * s'exécute en JavaScript pendant qu'elle s'écoule.
 */
import AppIcon from '@/components/AppIcon.vue'
import type { ToastVariant } from '@/composables/useToast'

const props = defineProps<{
  variant: ToastVariant
  title: string
  description?: string
  /** Durée d'affichage, en ms — elle cadence la barre de progression. */
  duration: number
}>()

defineEmits<{ dismiss: [] }>()

const STYLES: Record<ToastVariant, { icon: string; tint: string; bar: string }> = {
  success: { icon: 'CircleCheck',  tint: 'bg-status-done-bg text-status-done-fg',         bar: 'bg-status-success' },
  error:   { icon: 'CircleAlert',  tint: 'bg-status-danger-bg text-status-danger',        bar: 'bg-status-danger' },
  info:    { icon: 'Info',         tint: 'bg-brand-50 text-brand-700',                    bar: 'bg-brand-700' },
}

const style = STYLES[props.variant]
</script>

<template>
  <div
    class="pointer-events-auto relative w-full overflow-hidden rounded-[14px] border border-line bg-white shadow-ds-lg"
    role="status"
    aria-live="polite"
  >
    <div class="flex items-start gap-3 p-3.5">
      <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" :class="style.tint">
        <AppIcon :name="style.icon" :size="18" :stroke-width="1.75" />
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold leading-[1.3] text-ink">{{ title }}</p>
        <p v-if="description" class="mt-0.5 text-xs leading-[1.4] text-muted">{{ description }}</p>
      </div>

      <button
        class="flex-none rounded-md p-1 text-faint transition-colors hover:bg-canvas hover:text-ink"
        aria-label="Fermer"
        @click="$emit('dismiss')"
      >
        <AppIcon name="X" :size="15" :stroke-width="2" />
      </button>
    </div>

    <div
      class="toast-timer absolute bottom-0 left-0 h-[3px] w-full origin-left"
      :class="style.bar"
      :style="{ animationDuration: `${duration}ms` }"
    />
  </div>
</template>

<style scoped>
@keyframes toast-timer {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

.toast-timer {
  animation-name: toast-timer;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

/* Un compte à rebours qui file est exactement le genre de mouvement que le
   réglage système vise : le message reste, la barre ne s'anime plus. */
@media (prefers-reduced-motion: reduce) {
  .toast-timer {
    animation: none;
  }
}
</style>
