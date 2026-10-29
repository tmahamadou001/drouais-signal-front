<script setup lang="ts">
import type { RealtimeNotification } from '@/types/realtime'
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  notifications: readonly RealtimeNotification[]
}>()

defineEmits<{
  dismiss: [id: string]
  click: [reportId: string]
}>()

/**
 * Le dessin et la teinte d'une notification.
 *
 * Des glyphes lucide et non des emoji : ils se dessinent différemment d'un
 * système à l'autre, ne prennent pas la couleur du statut, et jurent au milieu
 * d'un jeu d'icônes au trait — la même raison qui les a fait disparaître des
 * catégories.
 */
const STYLES: Record<RealtimeNotification['type'], { icon: string; tint: string }> = {
  new_report:    { icon: 'Inbox',         tint: 'bg-brand-50 text-brand-700' },
  status_change: { icon: 'RefreshCw',     tint: 'bg-status-progress-bg text-status-progress-fg' },
  new_vote:      { icon: 'Users',         tint: 'bg-status-done-bg text-status-done-fg' },
  citizen_reply: { icon: 'MessageCircle', tint: 'bg-brand-50 text-brand-700' },
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "À l'instant"
  const minutes = Math.floor(seconds / 60)
  if (minutes === 1) return 'Il y a 1 min'
  return `Il y a ${minutes} min`
}
</script>

<template>
  <div class="font-ui pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        class="pointer-events-auto cursor-pointer rounded-[14px] border border-line bg-white p-3.5 shadow-ds-lg transition-shadow hover:shadow-xl"
        @click="$emit('click', notif.reportId)"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]"
            :class="STYLES[notif.type].tint"
          >
            <AppIcon :name="STYLES[notif.type].icon" :size="18" :stroke-width="1.75" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold leading-[1.3] text-ink">
              {{ notif.reportTitle }}
            </p>
            <p class="mt-0.5 text-xs leading-[1.3] text-muted">
              {{ notif.message }}
            </p>
            <p class="mt-1 text-[11px] font-medium leading-none text-faint">
              {{ timeAgo(notif.timestamp) }}
            </p>
          </div>

          <button
            class="flex-none p-0.5 text-faint transition-colors hover:text-ink"
            :aria-label="`Masquer : ${notif.reportTitle}`"
            @click.stop="$emit('dismiss', notif.id)"
          >
            <AppIcon name="X" :size="16" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.3s ease-in;
}
.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
