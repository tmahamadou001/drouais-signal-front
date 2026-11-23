<script lang="ts">
import { ref } from 'vue'

/**
 * Le signalement dont le menu est ouvert — **un seul à la fois**, pour toute la table.
 *
 * Un état par cellule laissait le premier menu ouvert quand on en ouvrait un deuxième : le clic sur
 * la seconde cellule est arrêté (`.stop`, pour ne pas ouvrir la fiche), il n'arrivait donc jamais
 * au `document` qui aurait fermé la première.
 */
const openId = ref<string | null>(null)
</script>

<script setup lang="ts">
/**
 * Confier un signalement **depuis la ligne**, sans ouvrir le panneau.
 *
 * Le panneau reste le lieu d'un choix réfléchi (service, aiguillage des prochains signalements). Mais
 * confier à une personne est le geste le plus fréquent d'un responsable d'équipe, et il demandait
 * d'ouvrir la fiche, de cliquer « Assigner », de chercher, de valider. Ici : un clic sur la cellule, un
 * clic sur la personne. Soi-même d'abord, comme dans la fenêtre complète.
 *
 * Le service du signalement n'est pas touché : ce choix-ci ne parle que de la personne.
 */
import { computed, nextTick, onBeforeUnmount, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useAssignment } from '@/composables/useAssignment'
import { useTeamDirectory } from '@/composables/useTeamDirectory'
import { useAuthStore } from '@/stores/auth'
import type { Report } from '@/types'

const props = defineProps<{ report: Report; enabled: boolean }>()
const emit = defineEmits<{ assigned: [] }>()

const auth = useAuthStore()
const directory = useTeamDirectory()
const { assign, saving } = useAssignment()

const open = computed({
  get: () => openId.value === props.report.id,
  set: (value: boolean) => { openId.value = value ? props.report.id : null },
})
const search = ref('')
const trigger = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const position = ref({ top: 0, left: 0 })

const MENU_WIDTH = 264
const MENU_MAX_HEIGHT = 340
/** Au-delà, une liste se cherche plus vite qu'elle ne se parcourt. */
const SEARCH_FROM = 7

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Moi d'abord, puis les autres par ordre alphabétique (l'annuaire est déjà trié). */
const people = computed(() => {
  const needle = normalize(search.value.trim())
  const list = directory.assignable.value.filter((member) => !needle || normalize(member.name ?? '').includes(needle))
  const me = auth.user?.id
  return [...list.filter((member) => member.userId === me), ...list.filter((member) => member.userId !== me)]
})

async function toggle() {
  open.value = !open.value
  if (!open.value) return
  search.value = ''
  void directory.load()
  await nextTick()
  const box = trigger.value?.getBoundingClientRect()
  if (!box) return
  // Sous la cellule ; au-dessus quand il n'y a pas la place (dernières lignes de la table).
  const below = window.innerHeight - box.bottom
  const top = below >= MENU_MAX_HEIGHT + 12 ? box.bottom + 6 : Math.max(8, box.top - MENU_MAX_HEIGHT - 6)
  const left = Math.min(Math.max(8, box.left), window.innerWidth - MENU_WIDTH - 8)
  position.value = { top, left }
}

async function choose(assigneeId: string | null) {
  const result = await assign(props.report.id, { assigneeId })
  open.value = false
  if (result) emit('assigned')
}

// Le menu est téléporté dans `body` : un clic dedans est « hors » de la cellule, mais pas hors du menu.
function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (trigger.value?.contains(target) || menu.value?.contains(target)) return
  open.value = false
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  // La ligne quitte la table (filtre, page suivante) pendant que son menu est ouvert : il ne reste pas orphelin.
  if (open.value) open.value = false
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <!-- Pas de droit d'assigner (observateur, signalement clos) : la cellule seule, sans fausse promesse. -->
  <div v-if="!enabled" class="min-w-0"><slot /></div>

  <div v-else class="min-w-0" @click.stop>
    <button
      ref="trigger"
      type="button"
      class="group flex w-full min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-brand-50"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="report.assignee_id ? 'Changer de responsable' : 'Assigner à quelqu’un'"
      data-testid="quick-assign"
      @click="toggle"
    >
      <span class="min-w-0 flex-1"><slot /></span>
      <AppIcon name="ChevronDown" :size="13" :stroke-width="2" class="flex-none text-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="menu"
        role="menu"
        class="font-ui fixed z-[70] flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-ds-lg"
        :style="{ top: `${position.top}px`, left: `${position.left}px`, width: `${MENU_WIDTH}px`, maxHeight: `${MENU_MAX_HEIGHT}px` }"
        data-testid="quick-assign-menu"
        @click.stop
      >
        <input
          v-if="directory.assignable.value.length >= SEARCH_FROM"
          v-model="search"
          type="search"
          autocomplete="off"
          placeholder="Chercher un collègue"
          class="m-2 h-9 flex-none rounded-lg border border-line px-3 text-[13px] outline-none placeholder:text-faint focus:border-brand-700"
          data-testid="quick-assign-search"
        />

        <ul class="min-h-0 flex-1 overflow-y-auto py-1">
          <li v-for="member in people" :key="member.userId">
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50"
              :disabled="saving"
              :data-testid="`quick-assign-${member.userId}`"
              @click="choose(member.userId)"
            >
              <span class="min-w-0 flex-1 truncate">{{ member.name ?? 'Sans nom' }}</span>
              <span v-if="member.userId === auth.user?.id" class="flex-none text-[11px] font-semibold text-brand-700">Moi</span>
              <AppIcon v-else-if="member.userId === report.assignee_id" name="Check" :size="14" :stroke-width="2.25" class="flex-none text-brand-700" />
            </button>
          </li>
          <li v-if="people.length === 0" class="px-3 py-3 text-xs text-muted" data-testid="quick-assign-empty">Personne ne correspond.</li>
        </ul>

        <button
          v-if="report.assignee_id"
          type="button"
          role="menuitem"
          class="flex flex-none items-center gap-2 border-t border-line px-3 py-2.5 text-left text-[13px] font-medium text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
          :disabled="saving"
          data-testid="quick-unassign"
          @click="choose(null)"
        >
          <AppIcon name="UserMinus" :size="14" :stroke-width="1.75" />
          Remettre « à assigner »
        </button>
      </div>
    </Teleport>
  </div>
</template>
