<script setup lang="ts">
/**
 * Confier un signalement.
 *
 * On cherche un collègue par son nom et on le choisit ; on peut aussi se choisir
 * soi-même, et c'est le premier de la liste — le geste le plus fréquent est de
 * prendre un signalement. Le service se choisit à part : il décide de qui le
 * voit dans « Mon périmètre ».
 *
 * « Confier aussi les prochains signalements » règle l'aiguillage de la
 * catégorie : c'est un réglage de la commune, donc offert aux administrateurs
 * seulement — la case n'existe pas pour un agent.
 */
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useAssignment } from '@/composables/useAssignment'
import { useTeamDirectory } from '@/composables/useTeamDirectory'
import { useServices } from '@/composables/useServices'
import { useAuthStore } from '@/stores/auth'
import type { TeamView } from '@/types/team'

const props = defineProps<{
  open: boolean
  reportId: string
  categoryLabel: string
  team: TeamView | null
  isAdmin: boolean
}>()

const emit = defineEmits<{ close: []; assigned: [] }>()

const auth = useAuthStore()
const directory = useTeamDirectory()
const servicesStore = useServices()
const { assign, saving } = useAssignment()

const search = ref('')
const chosen = ref<string | null>(null)
const serviceId = ref('')
const alsoRoute = ref(false)

watch(() => props.open, (open) => {
  if (!open) return
  search.value = ''
  chosen.value = props.team?.assignee?.id ?? null
  serviceId.value = props.team?.service?.id ?? ''
  alsoRoute.value = false
  void directory.load()
  if (servicesStore.services.value.length === 0) void servicesStore.load()
}, { immediate: true })

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Moi d'abord, puis les autres par ordre alphabétique (l'annuaire est déjà trié). */
const people = computed(() => {
  const needle = normalize(search.value.trim())
  const list = directory.assignable.value.filter((member) => !needle || normalize(member.name ?? '').includes(needle))
  const me = auth.user?.id
  return [...list.filter((member) => member.userId === me), ...list.filter((member) => member.userId !== me)]
})

const unchanged = computed(
  () => chosen.value === (props.team?.assignee?.id ?? null) && serviceId.value === (props.team?.service?.id ?? '')
)

async function submit() {
  const result = await assign(props.reportId, {
    assigneeId: chosen.value,
    serviceId: serviceId.value || null,
    alsoRoute: props.isAdmin && alsoRoute.value,
  })
  if (result) {
    emit('assigned')
    emit('close')
  }
}

async function unassign() {
  const result = await assign(props.reportId, { assigneeId: null, serviceId: null })
  if (result) {
    emit('assigned')
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="font-ui fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

        <form class="relative flex max-h-[88vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg" @submit.prevent="submit">
          <header class="flex items-start gap-3 border-b border-line px-5 py-4">
            <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="UserPlus" :size="18" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">Assigner le signalement</h2>
              <p class="mt-0.5 truncate text-xs text-muted">{{ categoryLabel }}</p>
            </div>
            <button type="button" class="flex-none p-1 text-faint hover:text-ink" aria-label="Fermer" @click="emit('close')">
              <AppIcon name="X" :size="18" />
            </button>
          </header>

          <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            <div class="flex flex-col gap-2">
              <label for="assign-search" class="text-xs font-semibold leading-none text-muted">À QUI ?</label>
              <input
                id="assign-search" v-model="search" type="search" autocomplete="off" placeholder="Chercher un collègue par son nom"
                class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
              />
              <ul class="flex max-h-[220px] flex-col gap-1 overflow-y-auto" role="radiogroup" aria-label="Collègue">
                <li v-for="member in people" :key="member.userId">
                  <button
                    type="button" role="radio" :aria-checked="chosen === member.userId"
                    class="flex w-full items-center gap-2.5 rounded-[10px] border px-3 py-2 text-left transition-colors"
                    :class="chosen === member.userId ? 'border-brand-700 bg-brand-50' : 'border-line hover:bg-canvas'"
                    :data-testid="`assign-${member.userId}`"
                    @click="chosen = chosen === member.userId ? null : member.userId"
                  >
                    <span class="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                      {{ member.name ?? 'Membre sans nom' }}
                      <span v-if="member.userId === auth.user?.id" class="font-medium text-muted"> (moi)</span>
                    </span>
                    <span class="text-[11px] text-muted">{{ member.role === 'admin' ? 'Administrateur' : 'Agent' }}</span>
                    <AppIcon v-if="chosen === member.userId" name="Check" :size="15" class="text-brand-700" />
                  </button>
                </li>
                <li v-if="people.length === 0" class="px-1 py-2 text-[13px] text-muted">Aucun collègue ne correspond.</li>
              </ul>
            </div>

            <div class="flex flex-col gap-2">
              <label for="assign-service" class="text-xs font-semibold leading-none text-muted">SERVICE (FACULTATIF)</label>
              <select
                id="assign-service" v-model="serviceId"
                class="h-10 rounded-[10px] border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-700"
              >
                <option value="">Aucun service</option>
                <option v-for="service in servicesStore.services.value" :key="service.id" :value="service.id">{{ service.name }}</option>
              </select>
            </div>

            <label v-if="isAdmin" class="flex items-start gap-2.5 rounded-[10px] bg-canvas px-3.5 py-3 text-[13px] leading-[1.45] text-ink">
              <input v-model="alsoRoute" type="checkbox" class="mt-0.5 h-4 w-4 accent-brand-700" data-testid="also-route" />
              <span>Confier aussi les prochains signalements « {{ categoryLabel }} » à cette personne et à ce service.</span>
            </label>
          </div>

          <footer class="flex items-center gap-2 border-t border-line px-5 py-3">
            <button
              v-if="team?.assignee || team?.service" type="button" :disabled="saving"
              class="mr-auto h-9 rounded-[10px] px-3 text-[13px] font-semibold text-status-danger hover:bg-status-danger/10"
              data-testid="unassign" @click="unassign"
            >
              Retirer l’assignation
            </button>
            <button type="button" class="ml-auto h-9 rounded-[10px] border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-neutral-100" @click="emit('close')">
              Annuler
            </button>
            <button
              type="submit" :disabled="saving || unchanged || (!chosen && !serviceId)"
              class="h-9 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="submit-assign"
            >
              {{ saving ? 'Assignation…' : 'Assigner' }}
            </button>
          </footer>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
