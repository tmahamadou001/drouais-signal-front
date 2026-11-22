<script setup lang="ts">
/**
 * Les réponses types de la commune — la voix de la mairie, écrite une fois.
 *
 * Les agents les insèrent depuis le panneau des échanges ; seuls les administrateurs
 * les écrivent. Un modèle ne part jamais tout seul : il s'insère, l'agent relit.
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { useReplyTemplates, type ReplyTemplate } from '@/composables/useReplyTemplates'

const MAX_BODY = 500
const store = useReplyTemplates()

const editing = ref<ReplyTemplate | 'new' | null>(null)
const title = ref('')
const body = ref('')
const saving = ref(false)
const deleting = ref<ReplyTemplate | null>(null)

onMounted(() => void store.load(true))

function edit(template: ReplyTemplate | 'new') {
  editing.value = template
  title.value = template === 'new' ? '' : template.title
  body.value = template === 'new' ? '' : template.body
}

async function submit() {
  if (!title.value.trim() || !body.value.trim() || saving.value) return
  saving.value = true
  const id = editing.value && editing.value !== 'new' ? editing.value.id : undefined
  const ok = await store.save({ title: title.value.trim(), body: body.value.trim() }, id)
  saving.value = false
  if (ok) editing.value = null
}

async function confirmDelete() {
  if (!deleting.value) return
  await store.remove(deleting.value.id)
  deleting.value = null
}
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas" data-testid="templates-page">
    <AdminPageHeader>
      <template #actions>
        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 transition-colors hover:bg-brand-800"
          data-testid="new-template" @click="edit('new')"
        >
          <AppIcon name="Plus" :size="16" :stroke-width="2" class="text-white" />
          <span class="text-[13px] font-semibold leading-none text-white">Nouveau modèle</span>
        </button>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-[22px]">
    <p class="max-w-[68ch] text-[13px] leading-[1.55] text-muted">
      Des réponses prêtes à l’emploi pour vos agents. Elles s’insèrent dans la zone de saisie : l’agent relit et adapte avant d’envoyer.
    </p>

    <p v-if="!store.loading.value && store.templates.value.length === 0" class="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted" data-testid="templates-empty">
      Aucun modèle pour l’instant. Créez la réponse que vos agents tapent le plus souvent.
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li v-for="template in store.templates.value" :key="template.id" class="flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3" data-testid="template-row">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-ink">{{ template.title }}</p>
          <p class="mt-0.5 whitespace-pre-line text-[13px] leading-[1.5] text-muted">{{ template.body }}</p>
        </div>
        <button class="h-8 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-canvas" @click="edit(template)">Modifier</button>
        <button class="h-8 rounded-lg px-2 text-xs font-semibold text-status-danger hover:bg-status-danger/10" :data-testid="`delete-${template.id}`" @click="deleting = template">Supprimer</button>
      </li>
    </ul>
    </div>

    <Teleport to="body">
      <div v-if="editing" class="font-ui fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-900/40" @click="editing = null" />
        <form class="relative w-full max-w-[480px] overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg" data-testid="template-form" @submit.prevent="submit">
          <header class="border-b border-line px-5 py-4">
            <h2 class="text-[15px] font-bold text-brand-900">{{ editing === 'new' ? 'Nouveau modèle' : 'Modifier le modèle' }}</h2>
          </header>
          <div class="flex flex-col gap-3 px-5 py-4">
            <label class="flex flex-col gap-1 text-xs font-semibold text-ink">
              Titre
              <input v-model="title" maxlength="80" required data-testid="template-title" class="h-10 rounded-[10px] border border-line px-3 text-sm font-normal">
            </label>
            <label class="flex flex-col gap-1 text-xs font-semibold text-ink">
              Texte
              <textarea v-model="body" rows="5" :maxlength="MAX_BODY" required data-testid="template-body" class="resize-none rounded-[10px] border border-line px-3 py-2 text-sm font-normal leading-[1.5]" />
              <span class="self-end text-[11px] font-medium tabular-nums text-faint">{{ body.length }} / {{ MAX_BODY }}</span>
            </label>
          </div>
          <footer class="flex justify-end gap-2 border-t border-line px-5 py-3">
            <button type="button" class="h-9 rounded-[10px] border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-neutral-100" @click="editing = null">Fermer</button>
            <button type="submit" :disabled="saving || !title.trim() || !body.trim()" data-testid="template-submit" class="h-9 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50">Enregistrer</button>
          </footer>
        </form>
      </div>
    </Teleport>

    <AppModal
      :open="deleting !== null" title="Supprimer ce modèle"
      :description="`« ${deleting?.title ?? ''} » ne sera plus proposé aux agents. Les messages déjà envoyés ne changent pas.`"
      confirm-text="Supprimer" confirm-variant="danger" @confirm="confirmDelete" @cancel="deleting = null" @close="deleting = null"
    />
  </div>
</template>
