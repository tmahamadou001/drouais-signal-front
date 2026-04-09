<script setup lang="ts">
import type { RealtimeConnectionStatus } from '@/types/realtime'

defineProps<{
  status: RealtimeConnectionStatus
}>()

const config = {
  connected: {
    dot: 'bg-green-500 animate-pulse',
    text: 'text-green-600',
    label: 'Live',
  },
  connecting: {
    dot: 'bg-yellow-400 animate-pulse',
    text: 'text-yellow-600',
    label: 'Connexion...',
  },
  reconnecting: {
    dot: 'bg-orange-400 animate-pulse',
    text: 'text-orange-600',
    label: 'Reconnexion...',
  },
  disconnected: {
    dot: 'bg-gray-400',
    text: 'text-gray-500',
    label: 'Hors ligne',
  },
  error: {
    dot: 'bg-red-500',
    text: 'text-red-600',
    label: 'Erreur',
  },
} as const
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span class="w-2 h-2 rounded-full flex-shrink-0" :class="config[status].dot" />
    <span class="text-xs font-medium" :class="config[status].text">
      {{ config[status].label }}
    </span>
  </div>
</template>
