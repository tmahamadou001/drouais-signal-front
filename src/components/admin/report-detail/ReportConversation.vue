<script setup lang="ts">
/**
 * Le dialogue entre l'agent et l'habitant.
 *
 * Alterné, pas empilé par auteur : on relit un échange, pas deux monologues.
 * L'aplatissement des fils est fait par l'appelant — le serveur rend des
 * messages d'agent portant leurs réponses.
 *
 * Le balisage n'est pas partagé avec `ReportComments.vue` : la logique l'est
 * — c'est le composable `useReportComments` — mais celle-ci parle à un agent et
 * l'autre à un habitant, et le même balisage pour les deux finirait par ne
 * convenir à personne.
 */
import { ref, watch, nextTick } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

interface ConversationMessage {
  id: string
  authorType: string
  author?: { email: string }
  content: string
  photoUrl?: string | null
  createdAt: string
}

const props = defineProps<{
  messages: ConversationMessage[]
  loading: boolean
}>()

const emit = defineEmits<{ zoom: [url: string] }>()

const conversationEnd = ref<HTMLElement | null>(null)

function authorName(comment: ConversationMessage): string {
  if (comment.authorType === 'citizen') return 'Habitant'
  const email = comment.author?.email
  return email ? email.split('@')[0] : 'Agent'
}

function commentTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).replace(', ', ' · ')
}

/**
 * Fait défiler jusqu'au dernier message.
 *
 * `scrollIntoView` n'existe pas partout — jsdom ne l'implémente pas, et un
 * appel direct jette pendant les tests. Le comportement visé est un confort :
 * il ne doit jamais interrompre l'ouverture du panneau.
 */
function scrollToEnd(behavior: ScrollBehavior = 'auto') {
  const target = conversationEnd.value
  if (typeof target?.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior, block: 'end' })
  }
}

watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    scrollToEnd()
  }
)

defineExpose({ scrollToEnd })
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col gap-3">
    <div class="flex flex-none items-center gap-[9px]">
      <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">
        ÉCHANGES AVEC L’HABITANT
      </span>
      <span
        v-if="messages.length > 0"
        class="whitespace-nowrap rounded-md bg-brand-50 px-[7px] py-1 text-[11px] font-semibold leading-none tabular-nums text-brand-700"
      >
        {{ messages.length }} message{{ messages.length > 1 ? 's' : '' }}
      </span>
    </div>

    <p v-if="loading" class="text-[13px] text-muted">Chargement…</p>

    <p v-else-if="messages.length === 0" class="text-[13px] leading-[1.5] text-muted">
      Aucun échange. Un message envoyé ici part à l’habitant par e-mail.
    </p>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="comment in messages"
        :key="comment.id"
        class="flex items-start gap-2.5"
        :class="comment.authorType === 'citizen' ? 'flex-row-reverse' : ''"
      >
        <div
          class="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full"
          :class="comment.authorType === 'citizen' ? 'bg-hairline' : 'bg-brand-50'"
        >
          <AppIcon
            :name="comment.authorType === 'citizen' ? 'User' : 'Wrench'"
            :size="15" :stroke-width="1.75"
            :class="comment.authorType === 'citizen' ? 'text-muted' : 'text-brand-700'"
          />
        </div>

        <div
          class="flex max-w-[76%] flex-col gap-[5px]"
          :class="comment.authorType === 'citizen' ? 'items-end' : ''"
        >
          <div
            class="flex flex-col gap-[7px] rounded-xl border px-[13px] py-[11px]"
            :class="comment.authorType === 'citizen'
              ? 'border-brand-100 bg-brand-50'
              : 'border-line bg-white'"
          >
            <div class="flex items-baseline gap-[7px]">
              <span class="whitespace-nowrap text-xs font-bold leading-none text-brand-900">
                {{ authorName(comment) }}
              </span>
              <span class="whitespace-nowrap text-[11px] font-medium leading-none text-muted">
                {{ comment.authorType === 'citizen' ? 'Habitant' : 'Service' }}
              </span>
            </div>
            <p class="text-sm leading-[1.5] text-ink">{{ comment.content }}</p>
            <button
              v-if="comment.photoUrl"
              class="overflow-hidden rounded-lg border border-line"
              @click="emit('zoom', comment.photoUrl!)"
            >
              <img :src="comment.photoUrl" alt="" class="max-h-40 w-full object-cover" />
            </button>
          </div>
          <span class="whitespace-nowrap text-[11px] font-medium leading-none tabular-nums text-faint">
            {{ commentTime(comment.createdAt) }}
          </span>
        </div>
      </div>
      <div ref="conversationEnd" />
    </div>
  </section>
</template>
