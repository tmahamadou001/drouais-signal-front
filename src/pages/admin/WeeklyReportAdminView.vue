<script setup lang="ts">
/**
 * La synthèse hebdomadaire : l'aperçu, les destinataires, l'envoi.
 *
 *  - **lire n'est pas envoyer.** L'écran entier exigeait `admin`. Or cette
 *    synthèse est le seul document de la plateforme qui résume la semaine en
 *    une page : c'est précisément ce qu'un élu ou un responsable de service
 *    vient consulter. L'*envoyer* écrit à des destinataires au nom de la
 *    commune, et *gérer la liste* décide à qui elle écrira chaque semaine —
 *    les deux restent à l'administrateur, ici comme sur le serveur ;
 *  - **les trois gestes annonçaient leur résultat par `alert()`** : la boîte
 *    native du navigateur, qui bloque la page, ne ressemble à rien d'autre
 *    dans l'application et ne peut pas dire *quoi* a échoué. Ils passent par
 *    les toasts, comme toute action du back-office ;
 *  - **le reste rejoint le gabarit maison.** C'était le dernier écran écrit en
 *    palette Tailwind brute — `bg-gray-50`, `text-primary`, `bg-blue-100` —
 *    avec ses propres modales et ses propres boutons.
 */
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useWeeklyReport, type Recipient } from '@/composables/useWeeklyReport'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import WeeklySummaryCards from '@/pages/admin/weekly/WeeklySummaryCards.vue'
import RecipientsList from '@/pages/admin/weekly/RecipientsList.vue'
import AddRecipientDialog from '@/pages/admin/weekly/AddRecipientDialog.vue'
import PreviewDialog from '@/pages/admin/weekly/PreviewDialog.vue'

const { isAdmin } = storeToRefs(useAuthStore())

const report = useWeeklyReport()
const {
  stats, previewHtml, recipients, active,
  loadingPreview, loadingRecipients, sending, acting,
} = report

const previewOpen = ref(false)
const addOpen = ref(false)
const confirmSend = ref(false)
const removing = ref<Recipient | null>(null)

onMounted(() => void report.loadRecipients())

async function openPreview() {
  if (await report.loadPreview()) previewOpen.value = true
}

async function onAdd(recipient: Parameters<typeof report.addRecipient>[0]) {
  if (await report.addRecipient(recipient)) addOpen.value = false
}

async function onRemove() {
  if (!removing.value) return
  if (await report.removeRecipient(removing.value)) removing.value = null
}

async function onSend() {
  confirmSend.value = false
  previewOpen.value = false
  await report.send()
}
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">
    <AdminPageHeader>
      <template #actions>
        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 transition-colors hover:bg-canvas disabled:opacity-50"
          :disabled="loadingPreview"
          @click="openPreview"
        >
          <AppIcon :name="loadingPreview ? 'Loader' : 'Eye'" :size="16" :stroke-width="1.75"
            :class="['text-muted', loadingPreview ? 'animate-spin' : '']" />
          <span class="text-[13px] font-semibold leading-none text-ink">
            {{ loadingPreview ? 'Calcul…' : 'Aperçu' }}
          </span>
        </button>

        <button
          v-if="isAdmin"
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 transition-colors hover:bg-brand-800 disabled:opacity-50"
          :disabled="sending || active.length === 0"
          :title="active.length === 0 ? 'Aucun destinataire actif' : undefined"
          @click="confirmSend = true"
        >
          <AppIcon :name="sending ? 'Loader' : 'Send'" :size="16" :stroke-width="2"
            :class="['text-white', sending ? 'animate-spin' : '']" />
          <span class="text-[13px] font-semibold leading-none text-white">
            {{ sending ? 'Envoi…' : 'Envoyer maintenant' }}
          </span>
        </button>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-7 py-[22px]">
      <WeeklySummaryCards v-if="stats" :stats="stats" />

      <!-- Sans aperçu, l'écran ne dirait rien de ce qu'il envoie. -->
      <button
        v-else
        class="flex flex-none flex-col items-center gap-2.5 rounded-[14px] border border-dashed border-brand-100 bg-white px-6 py-10 transition-colors hover:bg-canvas"
        :disabled="loadingPreview"
        @click="openPreview"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand-50">
          <AppIcon name="Mail" :size="22" :stroke-width="1.75" class="text-brand-700" />
        </div>
        <p class="text-sm font-semibold text-ink">Voir la synthèse de cette semaine</p>
        <p class="max-w-[420px] text-center text-[13px] leading-[1.5] text-muted">
          Les chiffres sont agrégés à la demande : ils ne sont calculés que lorsque vous
          les demandez, pas à chaque ouverture de l’écran.
        </p>
      </button>

      <RecipientsList
        :recipients="recipients"
        :loading="loadingRecipients"
        :can-edit="isAdmin"
        @add="addOpen = true"
        @remove="removing = $event"
      />
    </div>

    <PreviewDialog
      :open="previewOpen"
      :html="previewHtml"
      :can-send="isAdmin"
      :recipient-count="active.length"
      @close="previewOpen = false"
      @send="confirmSend = true"
    />

    <AddRecipientDialog
      :open="addOpen"
      :sending="acting"
      @close="addOpen = false"
      @submit="onAdd"
    />

    <AppModal
      :open="confirmSend"
      title="Envoyer la synthèse maintenant"
      :description="`Elle partira immédiatement à ${active.length} destinataire${active.length > 1 ? 's' : ''}. L’envoi automatique du créneau habituel aura lieu comme prévu.`"
      confirm-text="Envoyer"
      cancel-text="Annuler"
      confirm-variant="warning"
      :loading="sending"
      @confirm="onSend"
      @cancel="confirmSend = false"
      @close="confirmSend = false"
    />

    <AppModal
      :open="removing !== null"
      title="Retirer ce destinataire"
      :description="`${removing?.name ?? 'Cette personne'} ne recevra plus la synthèse hebdomadaire.`"
      confirm-text="Retirer"
      cancel-text="Annuler"
      confirm-variant="danger"
      :loading="acting"
      @confirm="onRemove"
      @cancel="removing = null"
      @close="removing = null"
    />
  </div>
</template>
