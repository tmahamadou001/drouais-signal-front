<script setup lang="ts">
/**
 * La cloche du back-office : ce qui concerne **moi**.
 *
 * Elle ne disait que « un habitant a répondu », pour toute la commune, et
 * seulement sur l'écran des signalements. Elle est maintenant dans l'en-tête de
 * **chaque** écran, et elle liste ce qui s'adresse au membre connecté : on l'a
 * cité, on lui a confié un signalement, un habitant a répondu à un signalement
 * dont il a la charge.
 *
 * Une ligne est lue quand on clique dessus. Ouvrir la cloche ne rend **rien**
 * lu : la liste montre ce qu'il reste à regarder, pas ce qu'on a survolé.
 * « Tout marquer comme lu » vide le compteur d'un coup.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useActivity } from '@/composables/useActivity'
import { activityIcon, activityTitle, badgeLabel, timeAgo } from '@/lib/activity'
import type { ActivityItem } from '@/types/team'

const router = useRouter()
const { items, unread, markRead, markAllRead } = useActivity()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') open.value = false }

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

const badge = computed(() => badgeLabel(unread.value))

/** Où atterrir : la réponse d'un habitant dans « Habitant », une mention dans « Interne ». */
function destination(item: ActivityItem) {
  const tab = item.kind === 'mention' ? 'internal' : item.kind === 'citizen_reply' ? 'citizen' : undefined
  return {
    name: 'AdminReports',
    query: { open: item.reportId ?? undefined, view: tab ? 'messages' : 'overview', tab },
  }
}

function pick(item: ActivityItem) {
  open.value = false
  void markRead(item.id)
  if (item.reportId) void router.push(destination(item))
}
</script>

<template>
  <div ref="root" class="relative flex-none">
    <button
      class="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line bg-white transition-colors hover:bg-canvas"
      :title="unread > 0 ? `${unread} notification(s) non lue(s)` : 'Aucune notification'"
      :aria-label="unread > 0 ? `${unread} notifications non lues` : 'Notifications'"
      aria-haspopup="true"
      :aria-expanded="open"
      data-testid="activity-bell"
      @click="open = !open"
    >
      <AppIcon name="Bell" :size="17" :stroke-width="1.75" class="text-ink" />
      <span
        v-if="unread > 0"
        class="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-status-danger px-1 text-[10px] font-bold leading-none tabular-nums text-white"
        data-testid="activity-badge"
      >
        {{ badge }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-[46px] z-50 flex max-h-[460px] w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-ds-lg"
      role="menu"
      data-testid="activity-panel"
    >
      <div class="flex flex-none items-center justify-between border-b border-line px-4 py-3">
        <span class="text-[13px] font-bold text-brand-900">Activité</span>
        <button
          v-if="unread > 0"
          class="text-xs font-semibold text-brand-700 hover:underline"
          data-testid="activity-read-all"
          @click="markAllRead()"
        >
          Tout marquer comme lu
        </button>
      </div>

      <p v-if="items.length === 0" class="px-4 py-8 text-center text-[13px] leading-[1.5] text-muted">
        Rien pour l’instant. Les mentions, les signalements qu’on vous confie et les
        réponses d’habitants s’afficheront ici.
      </p>

      <ul v-else class="min-h-0 flex-1 overflow-y-auto">
        <li v-for="item in items" :key="item.id">
          <button
            class="flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors hover:bg-canvas"
            :class="item.readAt ? '' : 'bg-brand-50/60'"
            role="menuitem"
            :data-unread="item.readAt ? 'false' : 'true'"
            @click="pick(item)"
          >
            <span class="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-canvas">
              <AppIcon :name="activityIcon(item.kind)" :size="14" :stroke-width="1.75" class="text-brand-700" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[13px] leading-[1.35]" :class="item.readAt ? 'font-medium text-ink' : 'font-bold text-brand-900'">
                {{ activityTitle(item) }}
              </span>
              <span v-if="item.reportTitle" class="mt-0.5 block truncate text-xs font-medium text-muted">
                {{ item.reportReference ? `${item.reportReference} · ` : '' }}{{ item.reportTitle }}
              </span>
              <span v-if="item.excerpt && item.kind !== 'assigned'" class="mt-1 line-clamp-2 block text-xs leading-[1.4] text-muted">
                « {{ item.excerpt }} »
              </span>
              <span class="mt-1 block text-[11px] font-medium text-faint">{{ timeAgo(item.createdAt) }}</span>
            </span>
            <span v-if="!item.readAt" class="mt-2 h-2 w-2 flex-none rounded-full bg-brand-700" aria-label="Non lu" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
