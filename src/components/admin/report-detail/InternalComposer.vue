<script setup lang="ts">
/**
 * La saisie d'un message interne, avec « @ » pour prévenir un collègue.
 *
 * Taper « @ » ouvre la liste des membres ; les flèches et Entrée (ou un clic)
 * insèrent « @Prénom Nom ». Au moment d'envoyer, on ne retient que les personnes
 * dont le nom figure **encore** dans le texte : effacer une mention après l'avoir
 * choisie la retire aussi de ceux qu'on prévient.
 */
import { computed, nextTick, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useTeamDirectory } from '@/composables/useTeamDirectory'
import { applyMention, detectMentionQuery, filterMentionable, mentionedIn, type Mentionable } from '@/lib/mentions'

const MAX = 500

defineProps<{ sending: boolean }>()
const emit = defineEmits<{ send: [content: string, mentions: string[]] }>()

const directory = useTeamDirectory()

const text = ref('')
const caret = ref(0)
const field = ref<HTMLTextAreaElement | null>(null)
const highlighted = ref(0)
/** Ceux qu'on a choisis dans la liste : leur id ne se devine pas du nom seul. */
const picked = ref<Mentionable[]>([])

const query = computed(() => detectMentionQuery(text.value, caret.value))

const options = computed(() => {
  if (!query.value) return []
  const candidates = directory.assignable.value
    .filter((member): member is typeof member & { name: string } => Boolean(member.name))
    .map((member) => ({ id: member.userId, name: member.name }))
  return filterMentionable(candidates, query.value.query)
})

const remaining = computed(() => MAX - text.value.length)
const canSend = computed(() => text.value.trim().length > 0 && remaining.value >= 0)

function syncCaret() {
  caret.value = field.value?.selectionStart ?? text.value.length
  highlighted.value = 0
}

async function choose(option: Mentionable) {
  if (!query.value) return
  const next = applyMention(text.value, caret.value, query.value, option.name)
  text.value = next.text
  if (!picked.value.some((person) => person.id === option.id)) picked.value.push(option)

  await nextTick()
  field.value?.focus()
  field.value?.setSelectionRange(next.caret, next.caret)
  caret.value = next.caret
}

function onKeydown(event: KeyboardEvent) {
  if (options.value.length > 0) {
    if (event.key === 'ArrowDown') { event.preventDefault(); highlighted.value = (highlighted.value + 1) % options.value.length; return }
    if (event.key === 'ArrowUp') { event.preventDefault(); highlighted.value = (highlighted.value - 1 + options.value.length) % options.value.length; return }
    if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); void choose(options.value[highlighted.value]); return }
    if (event.key === 'Escape') { event.preventDefault(); caret.value = 0; return }
  }

  // Entrée envoie, Maj+Entrée va à la ligne : le geste d'une messagerie.
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}

function submit() {
  if (!canSend.value) return
  emit('send', text.value.trim(), mentionedIn(text.value, picked.value))
}

function reset() {
  text.value = ''
  caret.value = 0
  picked.value = []
}

defineExpose({ reset })
</script>

<template>
  <div class="relative flex flex-col gap-2" data-testid="internal-composer">
    <ul
      v-if="options.length > 0"
      class="absolute bottom-full left-0 z-10 mb-1 w-full max-w-[320px] overflow-hidden rounded-[10px] border border-line bg-white shadow-ds-md"
      role="listbox" aria-label="Collègues"
    >
      <li v-for="(option, index) in options" :key="option.id">
        <button
          type="button" role="option" :aria-selected="index === highlighted"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink"
          :class="index === highlighted ? 'bg-brand-50' : 'hover:bg-canvas'"
          :data-testid="`mention-${option.id}`"
          @mousedown.prevent="choose(option)"
        >
          <AppIcon name="AtSign" :size="13" class="text-brand-700" />
          {{ option.name }}
        </button>
      </li>
    </ul>

    <div class="flex items-end gap-2">
      <textarea
        ref="field" v-model="text" rows="2" :maxlength="MAX + 50"
        placeholder="Message pour l’équipe — tapez @ pour prévenir un collègue"
        aria-label="Message interne"
        class="min-h-[44px] min-w-0 flex-1 resize-none rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[13px] leading-[1.45] text-ink outline-none placeholder:text-faint focus:border-brand-700"
        @input="syncCaret" @click="syncCaret" @keyup="syncCaret" @keydown="onKeydown"
      />
      <button
        type="button" :disabled="!canSend || sending"
        class="flex h-[44px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="send-internal" @click="submit"
      >
        <AppIcon name="Send" :size="14" :stroke-width="2" />
        {{ sending ? 'Envoi…' : 'Envoyer' }}
      </button>
    </div>
    <p class="text-right text-[11px] tabular-nums" :class="remaining < 0 ? 'text-status-danger' : 'text-faint'">{{ remaining }}</p>
  </div>
</template>
