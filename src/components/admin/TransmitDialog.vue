<script setup lang="ts">
/**
 * Transmettre un ou plusieurs signalements à un service extérieur.
 *
 * Deux cas, un seul écran :
 *
 *  - **la catégorie a des destinataires** : ils sont listés, l'agent confirme.
 *    C'est le cas courant, et il doit tenir en un clic ;
 *  - **elle n'en a pas** : l'agent choisit parmi les adresses que la commune
 *    connaît déjà, ou en saisit une.
 *
 * La sélection multiple passe par le même écran : c'est le même geste répété,
 * et lui donner sa propre boîte de dialogue aurait fait diverger les deux au
 * premier changement. Une seule chose change — l'option « enregistrer pour la
 * catégorie » disparaît, parce qu'une sélection couvre souvent plusieurs
 * catégories et qu'il n'y a alors aucune réponse honnête à la question de
 * savoir laquelle ce destinataire règle.
 */
import { ref, computed, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import AppIcon from '@/components/AppIcon.vue'
import RecipientPicker, { type KnownRecipient } from '@/components/admin/transmit/RecipientPicker.vue'

const props = defineProps<{
  open: boolean
  /** Un signalement, ou la sélection du tableau. */
  reportIds: string[]
  /** Le libellé de la catégorie, quand la sélection n'en couvre qu'une. */
  categoryLabel?: string
  /** Destinataires déjà configurés sur cette catégorie. */
  configured: string[]
}>()

const emit = defineEmits<{ close: []; transmitted: [] }>()

const { apiFetch } = useApi()
const toast = useToast()

const suggestions = ref<KnownRecipient[]>([])
const selected = ref<string[]>([])
const typed = ref('')
const serviceName = ref('')
const remember = ref(true)
const sending = ref(false)
const loadingSuggestions = ref(false)
const error = ref<string | null>(null)

const count = computed(() => props.reportIds.length)
const isBulk = computed(() => count.value > 1)
const hasConfigured = computed(() => props.configured.length > 0)

/**
 * Le réglage ne s'offre que sur une catégorie identifiée.
 *
 * Sur une sélection mélangée, « enregistrer pour la catégorie » n'a pas de
 * sujet — et l'enregistrer sur la première venue serait une décision prise à la
 * place de l'agent.
 */
const canRemember = computed(() => !isBulk.value && Boolean(props.categoryLabel))

const canSend = computed(() => hasConfigured.value || selected.value.length > 0)

watch(
  () => props.open,
  async (open) => {
    if (!open) return

    error.value = null
    typed.value = ''
    serviceName.value = ''
    selected.value = []
    remember.value = true

    if (hasConfigured.value) return

    // Les adresses connues arrivent du serveur : sans rien à l'écran pendant
    // ce temps, l'agent conclut qu'il n'y en a aucune et se met à retaper de
    // mémoire — ce que ces suggestions existent précisément pour éviter.
    loadingSuggestions.value = true
    try {
      const data = await apiFetch<{ recipients: KnownRecipient[] }>('/api/reports/service-recipients')
      suggestions.value = data.recipients
    } catch {
      // Sans suggestions, la saisie libre reste possible : c'est une commodité,
      // pas un passage obligé.
      suggestions.value = []
    } finally {
      loadingSuggestions.value = false
    }
  },
  { immediate: true }
)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function add(email: string) {
  const clean = email.trim().toLowerCase()
  if (!EMAIL.test(clean)) {
    error.value = 'Adresse e-mail invalide.'
    return
  }
  if (selected.value.includes(clean)) return

  selected.value = [...selected.value, clean]
  typed.value = ''
  error.value = null
}

function remove(email: string) {
  selected.value = selected.value.filter((item) => item !== email)
}

function pick(item: KnownRecipient) {
  add(item.email)
  if (!serviceName.value && item.serviceName) serviceName.value = item.serviceName
}

/** Ce que l'agent a choisi, ou rien si la catégorie décide déjà. */
function chosenRecipients() {
  return hasConfigured.value ? undefined : selected.value
}

async function sendOne() {
  await apiFetch(`/api/reports/${props.reportIds[0]}/transmit`, {
    method: 'POST',
    body: hasConfigured.value
      ? {}
      : {
          recipients: selected.value,
          serviceName: serviceName.value.trim() || undefined,
          remember: canRemember.value && remember.value,
        },
  })

  toast.success(
    'Signalement transmis',
    canRemember.value && remember.value && !hasConfigured.value
      ? `L’adresse est enregistrée pour la catégorie ${props.categoryLabel}.`
      : undefined
  )
}

/**
 * La transmission groupée rend le détail signalement par signalement.
 *
 * Un résultat partiel est courant — un signalement déjà résolu, une catégorie
 * sans destinataire — et annoncer « transmis » sur le lot entier serait faux
 * une fois sur deux.
 */
async function sendMany() {
  const result = await apiFetch<{
    transmitted: string[]
    failed: { id: string; reference: string | null; reason: string }[]
  }>('/api/reports/transmit', {
    method: 'POST',
    body: {
      ids: props.reportIds,
      recipients: chosenRecipients(),
      serviceName: serviceName.value.trim() || undefined,
    },
  })

  const sent = result.transmitted.length
  const failed = result.failed

  if (sent === 0) {
    toast.error('Aucune transmission', failed[0]?.reason)
    return
  }

  if (failed.length === 0) {
    toast.success(`${sent} signalement${sent > 1 ? 's' : ''} transmis`)
    return
  }

  toast.info(
    `${sent} sur ${props.reportIds.length} transmis`,
    `Non transmis : ${failed.map((item) => item.reference ?? item.id.slice(0, 8)).join(', ')}.`
  )
}

async function send() {
  if (!canSend.value || sending.value) return

  sending.value = true
  error.value = null

  try {
    await (isBulk.value ? sendMany() : sendOne())
    emit('transmitted')
    emit('close')
  } catch (err: any) {
    error.value = err?.message ?? 'La transmission a échoué.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="font-ui fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

        <div class="relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg">

          <header class="flex flex-none items-start gap-3 border-b border-line px-5 py-4">
            <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="Send" :size="18" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">Transmettre au service</h2>
              <p class="mt-0.5 text-xs leading-[1.4] text-muted">
                {{ isBulk ? `${count} signalements sélectionnés` : `Catégorie ${categoryLabel}` }}
              </p>
            </div>
            <button class="flex-none p-1 text-faint hover:text-ink" aria-label="Fermer" @click="emit('close')">
              <AppIcon name="X" :size="18" />
            </button>
          </header>

          <div class="flex max-h-[68vh] flex-col gap-4 overflow-y-auto px-5 py-5">

            <!-- Cas courant : la catégorie sait déjà à qui écrire. -->
            <template v-if="hasConfigured">
              <p class="text-[13px] leading-[1.5] text-muted">
                {{ isBulk ? 'Les signalements seront envoyés à :' : 'Le signalement sera envoyé à :' }}
              </p>
              <ul class="flex flex-col gap-1.5">
                <li
                  v-for="email in configured"
                  :key="email"
                  class="flex items-center gap-2 rounded-[10px] bg-canvas px-3 py-2 text-[13px] font-medium text-ink"
                >
                  <AppIcon name="Mail" :size="14" :stroke-width="1.75" class="flex-none text-muted" />
                  {{ email }}
                </li>
              </ul>
            </template>

            <!-- Aucun destinataire : on en choisit un. -->
            <template v-else>
              <p v-if="isBulk" class="text-[13px] leading-[1.5] text-muted">
                La sélection couvre plusieurs catégories, ou aucune n’a de service configuré.
                Les {{ count }} signalements partiront à la même adresse.
              </p>

              <RecipientPicker
                :selected="selected"
                :suggestions="suggestions"
                :loading="loadingSuggestions"
                :typed="typed"
                :service-name="serviceName"
                @update:typed="typed = $event"
                @update:service-name="serviceName = $event"
                @add="add"
                @remove="remove"
                @pick="pick"
              />

              <!-- Ce qui transforme un geste ponctuel en réglage. -->
              <label v-if="canRemember" class="flex items-start gap-2.5 rounded-[10px] bg-canvas px-3.5 py-3">
                <input v-model="remember" type="checkbox" class="mt-0.5 accent-brand-700" />
                <span class="text-[13px] leading-[1.5] text-ink">
                  Enregistrer pour la catégorie <strong>{{ categoryLabel }}</strong>
                  <span class="block text-xs text-muted">
                    Les prochains signalements de cette catégorie seront transmis automatiquement.
                  </span>
                </span>
              </label>
            </template>

            <p v-if="error" class="text-[13px] leading-[1.4] text-status-danger">{{ error }}</p>
          </div>

          <footer class="flex flex-none items-center gap-2.5 border-t border-line bg-canvas px-5 py-4">
            <button
              class="h-10 flex-none rounded-[10px] px-3.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
              @click="emit('close')"
            >
              Annuler
            </button>
            <button
              class="ml-auto flex h-10 flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
              :disabled="!canSend || sending"
              @click="send"
            >
              <AppIcon name="Send" :size="15" :stroke-width="2" />
              {{ sending ? 'Envoi…' : isBulk ? `Transmettre les ${count}` : 'Transmettre' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
