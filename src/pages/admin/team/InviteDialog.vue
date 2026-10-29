<script setup lang="ts">
/**
 * Inviter un membre.
 *
 * En modale, et non plus en accordéon au-dessus du tableau : le formulaire
 * poussait les membres existants hors de l'écran au moment précis où l'on
 * voulait vérifier que la personne n'y était pas déjà.
 *
 * Seule l'adresse est obligatoire. Le prénom, le nom et le poste sont un
 * confort pour la commune — les exiger ferait renoncer, et un membre sans
 * prénom reste un membre.
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import RolePicker from '@/pages/admin/team/RolePicker.vue'
import type { TeamRole } from '@/lib/roles'
import type { InvitePayload, TeamMember } from '@/composables/useTeam'

const props = defineProps<{
  open: boolean
  sending: boolean
  /** Pour prévenir avant l'envoi plutôt que sur un 409. */
  members: TeamMember[]
}>()

const emit = defineEmits<{ close: []; submit: [payload: InvitePayload] }>()

const email = ref('')
const role = ref<TeamRole>('agent')
const firstName = ref('')
const lastName = ref('')
const jobTitle = ref('')

watch(() => props.open, (open) => {
  if (!open) return
  email.value = ''
  role.value = 'agent'
  firstName.value = ''
  lastName.value = ''
  jobTitle.value = ''
})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const clean = computed(() => email.value.trim().toLowerCase())
const valid = computed(() => EMAIL.test(clean.value))

/** Déjà dans l'équipe : le dire avant l'envoi, pas après le refus du serveur. */
const existing = computed(() =>
  props.members.find((member) => member.email?.toLowerCase() === clean.value)
)

function submit() {
  if (!valid.value || props.sending) return
  emit('submit', {
    email: clean.value,
    role: role.value,
    firstName: firstName.value.trim() || undefined,
    lastName: lastName.value.trim() || undefined,
    jobTitle: jobTitle.value.trim() || undefined,
  })
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
              <AppIcon name="UserPlus" :size="18" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">Inviter un membre</h2>
              <p class="mt-0.5 text-xs leading-[1.4] text-muted">
                Il recevra un e-mail pour choisir son mot de passe.
              </p>
            </div>
            <button class="flex-none p-1 text-faint hover:text-ink" aria-label="Fermer" @click="emit('close')">
              <AppIcon name="X" :size="18" />
            </button>
          </header>

          <div class="flex max-h-[68vh] flex-col gap-4 overflow-y-auto px-5 py-5">
            <div class="flex flex-col gap-2">
              <label for="invite-email" class="text-xs font-semibold leading-none text-muted">
                ADRESSE E-MAIL
              </label>
              <input
                id="invite-email"
                v-model="email"
                type="email"
                placeholder="agent@mairie.fr"
                class="h-10 rounded-[10px] border bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
                :class="existing ? 'border-status-progress-dot' : 'border-line'"
                @keydown.enter.prevent="submit"
              />
              <p v-if="existing" class="flex items-start gap-1.5 text-xs leading-[1.45] text-status-progress-fg">
                <AppIcon name="Info" :size="13" :stroke-width="2" class="mt-px flex-none" />
                Cette adresse fait déjà partie de l’équipe ({{ existing.role }}).
              </p>
            </div>

            <RolePicker v-model="role" />

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label for="invite-first" class="text-xs font-semibold leading-none text-muted">
                  PRÉNOM (facultatif)
                </label>
                <input
                  id="invite-first"
                  v-model="firstName"
                  class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label for="invite-last" class="text-xs font-semibold leading-none text-muted">
                  NOM (facultatif)
                </label>
                <input
                  id="invite-last"
                  v-model="lastName"
                  class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
                />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label for="invite-job" class="text-xs font-semibold leading-none text-muted">
                POSTE (facultatif)
              </label>
              <input
                id="invite-job"
                v-model="jobTitle"
                placeholder="Technicien terrain"
                class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
              />
            </div>
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
              :disabled="!valid || sending"
              @click="submit"
            >
              <AppIcon name="Send" :size="15" :stroke-width="2" />
              {{ sending ? 'Envoi…' : 'Envoyer l’invitation' }}
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
