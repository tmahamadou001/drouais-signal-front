<script setup lang="ts">
/**
 * Les services de la collectivité : Voirie, Propreté, Espaces verts…
 *
 * Un service regroupe des collègues. Ses membres voient tous ses signalements
 * dans « Mon périmètre », et l'aiguillage peut lui confier une catégorie entière.
 *
 * À ne pas confondre avec le **service destinataire** des Paramètres, qui est une
 * adresse e-mail extérieure à qui l'on *transmet* : ici on confie au dedans.
 */
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import ServiceCard from '@/pages/admin/services/ServiceCard.vue'
import ServiceDialog from '@/pages/admin/services/ServiceDialog.vue'
import { useServices, type ServiceInput } from '@/composables/useServices'
import { useTeamDirectory } from '@/composables/useTeamDirectory'
import { useTenantCategories } from '@/composables/useTenantCategories'
import type { TenantService } from '@/types/team'

const { services, loading, load, create, update, remove, addMember, removeMember } = useServices()
const directory = useTeamDirectory()
const { getCategoryLabel } = useTenantCategories()

const dialogOpen = ref(false)
const editing = ref<TenantService | null>(null)
const saving = ref(false)
const deleting = ref<TenantService | null>(null)

onMounted(() => {
  void load()
  void directory.load()
})

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(service: TenantService) {
  editing.value = service
  dialogOpen.value = true
}

async function submit(input: ServiceInput) {
  saving.value = true
  const ok = editing.value ? await update(editing.value.id, input) : await create(input)
  saving.value = false
  if (ok) dialogOpen.value = false
}

async function confirmDelete() {
  if (!deleting.value) return
  const service = deleting.value
  deleting.value = null
  await remove(service)
}

const empty = computed(() => !loading.value && services.value.length === 0)
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas">
    <AdminPageHeader>
      <template #actions>
        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 transition-colors hover:bg-brand-800"
          data-testid="new-service"
          @click="openCreate"
        >
          <AppIcon name="Plus" :size="16" :stroke-width="2" class="text-white" />
          <span class="text-[13px] font-semibold leading-none text-white">Nouveau service</span>
        </button>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-7 py-[22px]">
      <p class="max-w-[68ch] text-[13px] leading-[1.55] text-muted">
        Un service regroupe des collègues qui travaillent ensemble. Ses membres voient tous ses
        signalements dans « Mon périmètre ». Pour transmettre à une entreprise ou à un autre organisme,
        utilisez plutôt le service destinataire d’une catégorie, dans les Paramètres.
      </p>

      <div v-if="loading && services.length === 0" class="text-[13px] text-muted">Chargement…</div>

      <div v-else-if="empty" class="flex max-w-[560px] flex-col items-start gap-3 rounded-[14px] border border-dashed border-line bg-white p-6">
        <AppIcon name="Network" :size="22" class="text-brand-700" />
        <h2 class="text-[15px] font-bold text-brand-900">Aucun service pour l’instant</h2>
        <p class="text-[13px] leading-[1.5] text-muted">
          Créez « Voirie », « Propreté »… puis ajoutez-y vos collègues. Les signalements pourront
          ensuite leur être confiés, à la main ou automatiquement selon la catégorie.
        </p>
        <button class="h-9 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-800" @click="openCreate">
          Créer le premier service
        </button>
      </div>

      <div v-else class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
        <ServiceCard
          v-for="service in services" :key="service.id"
          :service="service" :candidates="directory.assignable.value" :category-label="getCategoryLabel"
          @edit="openEdit(service)" @delete="deleting = service"
          @add-member="addMember(service.id, $event)" @remove-member="removeMember(service.id, $event)"
        />
      </div>
    </div>

    <ServiceDialog :open="dialogOpen" :service="editing" :saving="saving" @close="dialogOpen = false" @submit="submit" />

    <AppModal
      :open="deleting !== null"
      title="Supprimer ce service"
      :description="`« ${deleting?.name ?? ''} » sera supprimé. Si des signalements lui sont encore rattachés, la suppression sera refusée : réassignez-les d’abord.`"
      confirm-text="Supprimer" cancel-text="Annuler" confirm-variant="danger"
      @confirm="confirmDelete" @cancel="deleting = null" @close="deleting = null"
    />
  </div>
</template>
