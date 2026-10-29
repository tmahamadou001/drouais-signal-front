<script setup lang="ts">
/**
 * L'unique endroit où les toasts s'affichent : en bas à droite.
 *
 * En bas à droite et non en haut : le coin haut appartient déjà aux
 * notifications temps réel, qui annoncent ce que les autres font. Superposer
 * les deux familles ferait qu'un accusé de réception masquerait un signalement
 * qui vient d'arriver.
 *
 * Monté une fois dans le layout — la file est au niveau du module, donc
 * n'importe quel écran peut y déposer un message sans rien câbler.
 */
import { useToast, TOAST_DURATIONS } from '@/composables/useToast'
import AppToast from '@/components/ui/AppToast.vue'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="font-ui pointer-events-none fixed bottom-4 right-4 z-[80] flex w-full max-w-[360px] flex-col gap-2">
    <TransitionGroup name="toast">
      <AppToast
        v-for="toast in toasts"
        :key="toast.id"
        :variant="toast.variant"
        :title="toast.title"
        :description="toast.description"
        :duration="TOAST_DURATIONS[toast.variant]"
        @dismiss="dismiss(toast.id)"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
.toast-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}
</style>
