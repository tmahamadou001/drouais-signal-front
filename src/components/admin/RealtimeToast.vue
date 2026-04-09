<script setup lang="ts">
import type { RealtimeNotification } from '@/types/realtime'

defineProps<{
  notifications: readonly RealtimeNotification[]
}>()

defineEmits<{
  dismiss: [id: string]
  click: [reportId: string]
}>()

function getIcon(type: RealtimeNotification['type']) {
  const icons = {
    new_report: '🔔',
    status_change: '🔄',
    new_vote: '▲',
  }
  return icons[type]
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
  <div
    class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
  >
    <TransitionGroup name="toast">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 pointer-events-auto cursor-pointer hover:shadow-xl transition-shadow"
        @click="$emit('click', notif.reportId)"
      >
        <div class="flex items-start gap-3">
          <span class="text-xl flex-shrink-0">
            {{ getIcon(notif.type) }}
          </span>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">
              {{ notif.reportTitle }}
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ notif.message }}
            </p>
            <p class="text-xs text-gray-400 mt-1">
              {{ timeAgo(notif.timestamp) }}
            </p>
          </div>

          <button
            class="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5 transition-colors"
            @click.stop="$emit('dismiss', notif.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
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
