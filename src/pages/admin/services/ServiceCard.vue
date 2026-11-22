<script setup lang="ts">
/**
 * Un service : son nom, ses membres, ce que l'aiguillage lui envoie.
 *
 * Les membres s'ajoutent et se retirent **ici**, sans quitter la liste : c'est le
 * geste le plus fréquent après la création, et une page de détail par service
 * ferait de chaque ajout un aller-retour.
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { DirectoryMember, TenantService } from '@/types/team'

const props = defineProps<{
  service: TenantService
  /** Tous les membres à qui l'on peut confier un signalement. */
  candidates: DirectoryMember[]
  categoryLabel: (slug: string) => string
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  addMember: [userId: string]
  removeMember: [userId: string]
}>()

const members = computed(() =>
  props.service.memberIds
    .map((id) => props.candidates.find((candidate) => candidate.userId === id))
    .filter((member): member is DirectoryMember => Boolean(member))
)

/** Ceux qui ne sont pas encore dans ce service. */
const available = computed(() =>
  props.candidates.filter((candidate) => !props.service.memberIds.includes(candidate.userId))
)

const picked = ref('')

function add() {
  if (!picked.value) return
  emit('addMember', picked.value)
  picked.value = ''
}
</script>

<template>
  <article class="flex flex-col gap-4 rounded-[14px] border border-line bg-white p-5" :data-testid="`service-${service.id}`">
    <header class="flex items-start gap-3">
      <span class="mt-1 h-3 w-3 flex-none rounded-full bg-neutral-300" :style="service.color ? { backgroundColor: service.color } : {}" />
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-[15px] font-bold leading-tight text-brand-900">{{ service.name }}</h3>
        <p v-if="service.description" class="mt-1 text-[13px] leading-[1.4] text-muted">{{ service.description }}</p>
      </div>
      <div class="flex flex-none items-center gap-1.5">
        <button class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-ink" title="Modifier" aria-label="Modifier le service" @click="emit('edit')">
          <AppIcon name="Pencil" :size="14" :stroke-width="1.8" />
        </button>
        <button class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-status-danger" title="Supprimer" aria-label="Supprimer le service" @click="emit('delete')">
          <AppIcon name="Trash2" :size="14" :stroke-width="1.8" />
        </button>
      </div>
    </header>

    <dl class="grid grid-cols-2 gap-3 text-xs">
      <div class="rounded-[10px] bg-canvas px-3 py-2.5">
        <dt class="font-semibold tracking-[0.06em] text-muted">OUVERTS</dt>
        <dd class="mt-1 text-lg font-bold tabular-nums text-ink">{{ service.reportCount }}</dd>
      </div>
      <div class="rounded-[10px] bg-canvas px-3 py-2.5">
        <dt class="font-semibold tracking-[0.06em] text-muted">MEMBRES</dt>
        <dd class="mt-1 text-lg font-bold tabular-nums text-ink">{{ members.length }}</dd>
      </div>
    </dl>

    <section class="flex flex-col gap-2">
      <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">CE QUE CE SERVICE REÇOIT</span>
      <p v-if="service.routedCategories.length === 0" class="text-[13px] text-muted">
        Aucune catégorie ne lui est aiguillée. <RouterLink to="/admin/aiguillage" class="font-semibold text-brand-700 hover:underline">Configurer l’aiguillage</RouterLink>
      </p>
      <div v-else class="flex flex-wrap gap-1.5">
        <span v-for="slug in service.routedCategories" :key="slug" class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
          {{ categoryLabel(slug) }}
        </span>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <span class="text-[11px] font-semibold leading-none tracking-[0.08em] text-muted">AGENTS DU SERVICE</span>
      <p v-if="members.length === 0" class="text-[13px] text-muted">Personne pour l’instant.</p>
      <ul v-else class="flex flex-col gap-1.5">
        <li v-for="member in members" :key="member.userId" class="flex items-center gap-2 rounded-[10px] border border-line px-3 py-2">
          <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{{ member.name ?? 'Membre sans nom' }}</span>
          <span class="text-[11px] text-muted">{{ member.role === 'admin' ? 'Administrateur' : 'Agent' }}</span>
          <button class="text-faint hover:text-status-danger" :aria-label="`Retirer ${member.name ?? 'ce membre'}`" @click="emit('removeMember', member.userId)">
            <AppIcon name="X" :size="14" />
          </button>
        </li>
      </ul>

      <div v-if="available.length > 0" class="flex gap-2">
        <select
          v-model="picked" :aria-label="`Ajouter un agent à ${service.name}`"
          class="h-9 min-w-0 flex-1 rounded-[10px] border border-line bg-white px-2.5 text-[13px] text-ink outline-none focus:border-brand-700"
        >
          <option value="">Choisir un collègue…</option>
          <option v-for="candidate in available" :key="candidate.userId" :value="candidate.userId">
            {{ candidate.name ?? 'Membre sans nom' }}
          </option>
        </select>
        <button
          :disabled="!picked"
          class="h-9 flex-none rounded-[10px] bg-brand-700 px-3 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
          @click="add"
        >
          Ajouter au service
        </button>
      </div>
    </section>
  </article>
</template>
