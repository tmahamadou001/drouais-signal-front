<script setup lang="ts">
/**
 * La cloche de l'en-tête : les réponses d'habitants qu'aucun agent n'a lues.
 *
 * Elle existait déjà dans la maquette, mais ouvrait le filtre « en retard » —
 * ce que personne ne pouvait deviner d'une cloche. Elle dit maintenant ce
 * qu'elle a l'air de dire : quelqu'un a écrit, voici qui, voici quand.
 *
 * Le compteur n'est pas calculé ici : il vient de `useUnreadComments`, partagé
 * avec les pastilles du tableau. Deux compteurs de la même chose finissent
 * toujours par se contredire à l'écran.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useUnreadComments, type UnreadItem } from '@/composables/useUnreadComments'

const emit = defineEmits<{ open: [reportId: string] }>()

const { items, totalUnread } = useUnreadComments()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

/** Au-delà de neuf, le nombre exact n'aide plus : il y en a « beaucoup ». */
const badge = computed(() => (totalUnread.value > 9 ? '9+' : String(totalUnread.value)))

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000)

  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`

  const days = Math.floor(hours / 24)
  return days === 1 ? 'hier' : `il y a ${days} j`
}

function pick(item: UnreadItem) {
  open.value = false
  emit('open', item.report_id)
}
</script>

<template>
  <div ref="root" class="relative flex-none">
    <button
      class="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line bg-white transition-colors hover:bg-canvas"
      :title="totalUnread > 0
        ? `${totalUnread} réponse(s) d’habitants non lue(s)`
        : 'Aucune réponse en attente'"
      @click="open = !open"
    >
      <AppIcon name="Bell" :size="18" :stroke-width="1.75" class="text-brand-900" />

      <span
        v-if="totalUnread > 0"
        class="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-status-danger px-1 text-[10px] font-bold leading-none tabular-nums text-white"
      >
        {{ badge }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-[46px] z-30 flex w-[340px] flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-ds-lg"
    >
      <div class="flex flex-none items-center gap-2 border-b border-line px-4 py-3">
        <span class="text-[13px] font-semibold leading-none text-brand-900">Réponses des habitants</span>
        <span
          v-if="totalUnread > 0"
          class="ml-auto whitespace-nowrap rounded-md bg-brand-50 px-[7px] py-1 text-[11px] font-semibold leading-none tabular-nums text-brand-700"
        >
          {{ totalUnread }} non lue{{ totalUnread > 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Le vide est une bonne nouvelle, et doit se lire comme telle. -->
      <div v-if="items.length === 0" class="flex flex-col items-center gap-2 px-4 py-8">
        <AppIcon name="CheckCheck" :size="22" class="text-faint" />
        <p class="text-[13px] text-muted">Tout est lu.</p>
      </div>

      <div v-else class="max-h-[360px] overflow-y-auto">
        <button
          v-for="item in items"
          :key="item.report_id"
          class="flex w-full items-start gap-3 border-b border-hairline px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-canvas"
          @click="pick(item)"
        >
          <div class="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-brand-50">
            <AppIcon name="MessageCircle" :size="16" :stroke-width="1.75" class="text-brand-700" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-semibold leading-[1.3] text-ink">
              {{ item.report_title }}
            </p>
            <p class="truncate text-xs leading-[1.3] text-muted">
              {{ item.count > 1 ? `${item.count} réponses` : 'Une réponse' }}
              · {{ timeAgo(item.last_reply_at) }}
            </p>
            <p v-if="item.report_reference" class="truncate text-[11px] font-medium leading-[1.3] tabular-nums text-faint">
              {{ item.report_reference }}
            </p>
          </div>

          <AppIcon name="ChevronRight" :size="16" :stroke-width="1.75" class="mt-1 flex-none text-faint" />
        </button>
      </div>
    </div>
  </div>
</template>
