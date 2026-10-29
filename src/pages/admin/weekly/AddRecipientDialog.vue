<script setup lang="ts">
/**
 * Ajouter un destinataire à la synthèse.
 *
 * Le rôle est choisi dans une liste de libellés lisibles : la pastille
 * affichait `vp_numerique` sur la ligne, donc la liste proposait autant
 * d'énigmes.
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { RECIPIENT_ROLES, RECIPIENT_ROLE_KEYS } from '@/lib/recipientRoles'
import type { NewRecipient } from '@/composables/useWeeklyReport'

const props = defineProps<{ open: boolean; sending: boolean }>()

const emit = defineEmits<{ close: []; submit: [recipient: NewRecipient] }>()

const name = ref('')
const email = ref('')
const role = ref('elu')

watch(() => props.open, (open) => {
  if (!open) return
  name.value = ''
  email.value = ''
  role.value = 'elu'
})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const valid = computed(() => Boolean(name.value.trim()) && EMAIL.test(email.value.trim()))

function submit() {
  if (!valid.value || props.sending) return
  emit('submit', { name: name.value.trim(), email: email.value.trim().toLowerCase(), role: role.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="font-ui fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

        <div class="relative flex w-full max-w-[460px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg">
          <header class="flex flex-none items-start gap-3 border-b border-line px-5 py-4">
            <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="UserPlus" :size="18" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">Ajouter un destinataire</h2>
              <p class="mt-0.5 text-xs leading-[1.4] text-muted">Il recevra la synthèse chaque semaine.</p>
            </div>
            <button class="flex-none p-1 text-faint hover:text-ink" aria-label="Fermer" @click="emit('close')">
              <AppIcon name="X" :size="18" />
            </button>
          </header>

          <div class="flex flex-col gap-4 px-5 py-5">
            <div class="flex flex-col gap-2">
              <label for="recipient-name" class="text-xs font-semibold leading-none text-muted">NOM</label>
              <input
                id="recipient-name"
                v-model="name"
                placeholder="Jean Dupont"
                class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="recipient-email" class="text-xs font-semibold leading-none text-muted">ADRESSE E-MAIL</label>
              <input
                id="recipient-email"
                v-model="email"
                type="email"
                placeholder="jean.dupont@mairie.fr"
                class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
                @keydown.enter.prevent="submit"
              />
            </div>

            <div class="flex flex-col gap-2">
              <span class="text-xs font-semibold leading-none text-muted">À QUEL TITRE</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="key in RECIPIENT_ROLE_KEYS"
                  :key="key"
                  type="button"
                  class="rounded-lg border px-2.5 py-1.5 text-xs font-semibold leading-none transition-colors"
                  :class="role === key
                    ? `border-brand-700 ${RECIPIENT_ROLES[key].classes}`
                    : 'border-line bg-white text-muted hover:bg-canvas'"
                  @click="role = key"
                >
                  {{ RECIPIENT_ROLES[key].label }}
                </button>
              </div>
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
              <AppIcon name="Plus" :size="15" :stroke-width="2" />
              {{ sending ? 'Ajout…' : 'Ajouter' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active { transition: opacity 0.2s ease; }
.dialog-enter-from,
.dialog-leave-to { opacity: 0; }
</style>
