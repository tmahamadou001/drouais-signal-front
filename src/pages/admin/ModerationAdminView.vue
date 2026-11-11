<script setup lang="ts">
/**
 * La modération — super-administrateur uniquement.
 *
 * Elle n'existe que pour les communes ouvertes au public sans mairie
 * (migration 040), et c'est la contrepartie exacte de la décision de publier
 * sans elles : si nous publions, nous répondons de ce qui est publié. Partout
 * ailleurs, ce sont les agents de la commune qui modèrent, depuis leur propre
 * écran de signalements.
 *
 * L'écran est une grille de photos, par ordre d'arrivée. La modération se fait
 * à l'arrivée : ce qu'on veut voir en l'ouvrant, c'est ce qui vient de devenir
 * public — et ce qui pose problème est presque toujours dans l'image.
 */
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import ModerationCard from '@/components/admin/moderation/ModerationCard.vue'
import {
  MODERATION_COPY,
  reasonAccepted,
  type ModerationAction,
  type ModerationItem,
} from '@/lib/moderation'

const { apiFetch } = useApi()
const toast = useToast()

const items = ref<ModerationItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

/** Le geste en cours de confirmation : quel signalement, et lequel des trois. */
const pending = ref<{ item: ModerationItem; action: ModerationAction } | null>(null)
const reason = ref('')
const submitting = ref(false)

const copy = computed(() => (pending.value ? MODERATION_COPY[pending.value.action] : null))
const ready = computed(() => reasonAccepted(reason.value))

const load = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await apiFetch('/api/moderation/reports?limit=60')
    items.value = Array.isArray(response?.data) ? response.data : []
  } catch (err: any) {
    error.value = err.message ?? 'Chargement impossible'
  } finally {
    loading.value = false
  }
}

const ask = (item: ModerationItem, action: ModerationAction) => {
  reason.value = ''
  pending.value = { item, action }
}

const apply = async () => {
  if (!pending.value || !ready.value) return

  const { item, action } = pending.value
  submitting.value = true

  try {
    await apiFetch(`/api/moderation/reports/${item.id}/${MODERATION_COPY[action].path}`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason.value.trim() }),
    })

    toast.success(MODERATION_COPY[action].done)
    pending.value = null
    await load()
  } catch (err: any) {
    toast.error(err.message ?? 'Le geste a échoué.')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">
    <AdminPageHeader />

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-7 py-[22px]">
      <p class="max-w-3xl flex-none text-[13px] leading-[1.5] text-muted">
        Ces communes n’ont pas d’équipe municipale : personne sur place ne peut retirer un contenu.
        Une photo porte souvent ce qu’elle ne devrait pas — une plaque, une devanture, un visage.
        Chaque geste est enregistré avec son motif.
      </p>

      <div
        v-if="error"
        class="flex-none rounded-[14px] border border-[#F3C9C9] bg-status-danger-bg px-[18px] py-4 text-sm text-status-danger"
      >
        {{ error }}
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <AppSkeleton v-for="i in 8" :key="i" class="h-64 rounded-[14px]" />
      </div>

      <div
        v-else-if="items.length === 0"
        class="flex flex-col items-center gap-2 rounded-[14px] border border-line bg-white px-6 py-12 text-center"
      >
        <AppIcon name="ShieldCheck" :size="22" :stroke-width="1.6" class="text-neutral-400" />
        <p class="text-sm font-semibold text-ink">Rien à modérer</p>
        <p class="max-w-md text-[13px] leading-[1.5] text-muted">
          Aucune commune n’est ouverte au public pour le moment, ou aucune n’a encore reçu de
          signalement.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <ModerationCard
          v-for="item in items"
          :key="item.id"
          :item="item"
          :busy="submitting"
          @remove-photo="ask(item, 'photo')"
          @retract="ask(item, 'retract')"
          @restore="ask(item, 'restore')"
        />
      </div>
    </div>

    <AppModal
      v-if="pending && copy"
      :open="true"
      :title="copy.title(pending.item)"
      :description="copy.body"
      :confirm-text="copy.confirm"
      :confirm-variant="copy.tone"
      :loading="submitting"
      @confirm="apply"
      @cancel="pending = null"
      @close="pending = null"
    >
      <label class="mt-4 flex flex-col gap-1.5">
        <span class="text-[13px] font-medium text-neutral-700">
          Motif — conservé dans le journal d’audit
        </span>
        <input
          v-model="reason"
          type="text"
          autocomplete="off"
          placeholder="Plaque d’immatriculation lisible"
          class="rounded-ds border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <p v-if="!ready" class="mt-2 text-xs text-muted">
        Sans motif, le geste ne peut être ni expliqué ni contesté plus tard.
      </p>
    </AppModal>
  </div>
</template>
