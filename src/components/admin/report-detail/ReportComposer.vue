<script setup lang="ts">
/**
 * La zone de réponse à l'habitant.
 *
 * L'avertissement en tête est la partie qui compte : écrire dans le vide est le
 * défaut le plus coûteux de cet écran — l'agent croit avoir répondu, l'habitant
 * n'a rien reçu, et rien ne le signale.
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useReplyTemplates } from '@/composables/useReplyTemplates'

defineProps<{
  sending: boolean
  uploading: boolean
  /** L'habitant n'a laissé aucun moyen de contact. */
  unreachable: boolean
}>()

const emit = defineEmits<{
  send: [message: string, photoUrl: string | undefined, isResolution: boolean, isQuestion: boolean]
  pickPhoto: [file: File]
}>()

const MAX_MESSAGE = 500

const replyTemplates = useReplyTemplates()
const pickerOpen = ref(false)
onMounted(() => void replyTemplates.load())

/** Le modèle s'insère, il ne part pas : l'agent relit et adapte avant d'envoyer. */
function insertTemplate(body: string) {
  draft.value = (draft.value.trim() ? `${draft.value.trimEnd()}\n${body}` : body).slice(0, MAX_MESSAGE)
  pickerOpen.value = false
}

const draft = ref('')
const photoUrl = ref('')
const isResolutionPhoto = ref(false)
/** « Demander une précision » : le message attend une réponse, et la liste le dit. */
const isQuestion = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('pickPhoto', file)
  input.value = ''
}

function send() {
  if (!draft.value.trim()) return
  emit('send', draft.value, photoUrl.value || undefined, isResolutionPhoto.value, isQuestion.value)
}

/** Le brouillon est vidé par le parent, une fois l'envoi confirmé — pas avant. */
function reset() {
  draft.value = ''
  photoUrl.value = ''
  isResolutionPhoto.value = false
  isQuestion.value = false
}

function setPhoto(url: string) {
  photoUrl.value = url
}

defineExpose({ reset, setPhoto })
</script>

<template>
  <div
    v-if="unreachable"
    class="flex items-start gap-2.5 rounded-xl border border-[#F5D9A8] bg-status-progress-bg px-3.5 py-3"
  >
    <AppIcon name="BellOff" :size="16" :stroke-width="1.75" class="mt-px flex-none text-status-progress-fg" />
    <p class="text-xs leading-[1.5] text-status-progress-fg">
      <span class="font-semibold">Cet habitant n’a laissé aucun moyen de contact.</span>
      Votre message ne lui sera ni envoyé par e-mail ni notifié : il ne le verra que
      s’il rouvre son signalement dans l’application.
    </p>
  </div>

  <div class="flex flex-col gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3">
    <textarea
      v-model="draft"
      rows="2"
      :maxlength="MAX_MESSAGE"
      placeholder="Votre message pour l’habitant…"
      class="resize-none bg-transparent text-sm leading-[1.5] text-ink outline-none placeholder:text-faint"
    />

    <label class="flex items-center gap-2 text-xs font-medium text-muted" data-testid="question-toggle">
      <input v-model="isQuestion" type="checkbox" class="accent-brand-700" />
      Demander une précision — l’habitant peut répondre à l’e-mail
    </label>

    <div v-if="photoUrl" class="flex items-center gap-2.5">
      <img :src="photoUrl" alt="" class="h-12 w-12 rounded-lg border border-line object-cover" />
      <label class="flex items-center gap-1.5 text-xs font-medium text-muted">
        <input v-model="isResolutionPhoto" type="checkbox" class="accent-brand-700" />
        Photo de résolution
      </label>
      <button class="text-xs font-semibold text-status-danger hover:underline" @click="photoUrl = ''">
        Retirer
      </button>
    </div>

    <div class="flex items-center gap-2.5 whitespace-nowrap">
      <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="onFile" />
      <div v-if="replyTemplates.templates.value.length > 0" class="relative flex-none">
        <button
          class="flex items-center gap-1.5 text-xs font-semibold leading-none text-brand-700"
          data-testid="open-templates" @click="pickerOpen = !pickerOpen"
        >
          <AppIcon name="MessageSquareText" :size="14" :stroke-width="1.75" />
          Modèles
        </button>
        <div
          v-if="pickerOpen"
          class="absolute bottom-full left-0 z-10 mb-2 flex max-h-[260px] w-[280px] flex-col overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-ds-lg"
          role="listbox"
        >
          <button
            v-for="template in replyTemplates.templates.value" :key="template.id" role="option"
            class="flex flex-col gap-0.5 px-3 py-2 text-left hover:bg-canvas" :data-testid="`template-${template.id}`"
            @click="insertTemplate(template.body)"
          >
            <span class="text-[13px] font-semibold text-ink">{{ template.title }}</span>
            <span class="line-clamp-2 text-[11px] leading-[1.4] text-muted">{{ template.body }}</span>
          </button>
        </div>
      </div>
      <button
        class="flex flex-none items-center gap-1.5 text-xs font-semibold leading-none text-brand-700 disabled:opacity-50"
        :disabled="uploading"
        @click="photoInput?.click()"
      >
        <AppIcon name="Paperclip" :size="14" :stroke-width="1.75" />
        {{ uploading ? 'Envoi…' : 'Joindre une photo' }}
      </button>

      <span class="ml-auto flex-none text-[11px] font-medium leading-none tabular-nums text-faint">
        {{ draft.length }} / {{ MAX_MESSAGE }}
      </span>

      <button
        class="flex h-[34px] flex-none items-center gap-[7px] rounded-[10px] px-3 text-[13px] font-semibold leading-none transition-colors"
        :class="draft.trim() && !sending
          ? 'bg-brand-700 text-white hover:bg-brand-800'
          : 'cursor-not-allowed bg-brand-100 text-[#8FA9CB]'"
        :disabled="!draft.trim() || sending"
        @click="send"
      >
        <AppIcon name="Send" :size="15" :stroke-width="2" />
        {{ sending ? 'Envoi…' : isQuestion ? 'Demander' : 'Envoyer' }}
      </button>
    </div>
  </div>
</template>
