<script setup lang="ts">
/**
 * L'e-mail tel qu'il partira.
 *
 * Le HTML est celui que le serveur a construit, inséré tel quel : c'est tout
 * l'intérêt d'un aperçu — un rendu approximatif ne dirait rien de ce que les
 * élus recevront. Il ne vient que de notre propre gabarit, jamais d'une saisie.
 */
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  open: boolean
  html: string
  /** Seul un administrateur peut déclencher l'envoi depuis l'aperçu. */
  canSend: boolean
  recipientCount: number
}>()

const emit = defineEmits<{ close: []; send: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="font-ui fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

        <div class="relative flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg">
          <header class="flex flex-none items-center gap-3 border-b border-line px-5 py-4">
            <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="Mail" :size="18" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">Aperçu de la synthèse</h2>
              <p class="mt-0.5 text-xs leading-[1.4] text-muted">
                Exactement ce que les destinataires recevront.
              </p>
            </div>
            <button class="flex-none p-1 text-faint hover:text-ink" aria-label="Fermer" @click="emit('close')">
              <AppIcon name="X" :size="18" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto bg-canvas p-5">
            <div class="overflow-hidden rounded-xl border border-line bg-white">
              <div v-html="html" />
            </div>
          </div>

          <footer class="flex flex-none items-center gap-2.5 border-t border-line bg-canvas px-5 py-4">
            <button
              class="h-10 flex-none rounded-[10px] px-3.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
              @click="emit('close')"
            >
              Fermer
            </button>
            <button
              v-if="canSend"
              class="ml-auto flex h-10 flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
              :disabled="recipientCount === 0"
              @click="emit('send')"
            >
              <AppIcon name="Send" :size="15" :stroke-width="2" />
              Envoyer maintenant
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
