<script setup lang="ts">
/**
 * Le fil interne : l'équipe se parle, l'habitant ne le lit jamais.
 *
 * Un fil à plat, du plus ancien au plus récent — une conversation entre
 * collègues n'a pas de « message d'agent » auquel on répond. Les mentions sont
 * surlignées, et le bandeau du haut dit **qui lit** : c'est la question qu'on se
 * pose avant d'écrire quelque chose qu'on ne dirait pas à un habitant.
 */
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { segmentsOf } from '@/lib/mentions'
import { useTeamDirectory } from '@/composables/useTeamDirectory'
import type { InternalMessage } from '@/types/team'

const props = defineProps<{ messages: InternalMessage[]; loading: boolean }>()

const { members } = useTeamDirectory()
const names = computed(() => members.value.map((member) => member.name).filter((name): name is string => Boolean(name)))

const root = ref<HTMLElement | null>(null)

const when = (value: string) =>
  new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(', ', ' · ')

async function scrollToEnd(behavior: ScrollBehavior = 'auto') {
  await nextTick()
  root.value?.scrollTo({ top: root.value.scrollHeight, behavior })
}

defineExpose({ scrollToEnd, count: computed(() => props.messages.length) })
</script>

<template>
  <section ref="root" class="flex min-h-0 flex-1 flex-col gap-3" data-testid="internal-thread">
    <p class="flex items-start gap-2 rounded-[10px] bg-status-pending-bg px-3.5 py-2.5 text-xs leading-[1.5] text-ink">
      <AppIcon name="Lock" :size="14" class="mt-0.5 flex-none text-muted" />
      <span>Visible par toute l’équipe de la mairie, et par l’externe à qui le signalement est confié.
        <strong>Jamais envoyé à l’habitant.</strong></span>
    </p>

    <p v-if="loading && messages.length === 0" class="text-[13px] text-muted">Chargement…</p>
    <p v-else-if="messages.length === 0" class="text-[13px] leading-[1.5] text-muted">
      Aucun message interne. Posez une question à un collègue, ou laissez une consigne pour la prochaine intervention.
    </p>

    <article v-for="message in messages" :key="message.id" class="flex flex-col gap-1 rounded-xl border border-line bg-white px-3.5 py-3" data-testid="internal-message">
      <header class="flex items-baseline gap-2">
        <span class="text-xs font-bold leading-none text-brand-900">{{ message.author_name ?? 'Un collègue' }}</span>
        <span class="ml-auto whitespace-nowrap text-[11px] font-medium leading-none tabular-nums text-faint">{{ when(message.created_at) }}</span>
      </header>
      <p class="whitespace-pre-wrap break-words text-[13px] leading-[1.5] text-ink">
        <template v-for="(part, index) in segmentsOf(message.content, names)" :key="index">
          <span v-if="part.mention" class="rounded bg-brand-50 px-1 font-semibold text-brand-700">{{ part.text }}</span>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
    </article>
  </section>
</template>
