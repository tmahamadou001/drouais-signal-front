<script setup lang="ts">
/**
 * L'écran Équipe.
 *
 * Il listait qui existe. C'est un annuaire, et ce n'est pas la question qu'on
 * se pose en l'ouvrant : on veut savoir **qui a rejoint** et **qui travaille**.
 *
 *  - **le statut a trois états** — invité, actif, suspendu — au lieu d'un
 *    booléen qui affichait « actif » aussi bien pour un membre de six mois que
 *    pour quelqu'un n'ayant jamais ouvert son e-mail. Une invitation qui traîne
 *    depuis une semaine se signale d'elle-même : personne ne pense à vérifier
 *    qui n'a jamais répondu, et un compte qui n'existe pas est un agent qui ne
 *    traite pas ;
 *  - **chaque ligne dit ce que le membre fait** — ce qu'il a fait avancer sur
 *    trente jours, quand il s'est connecté pour la dernière fois ;
 *  - **le rôle a enfin des conséquences.** Il n'était qu'une pastille : toutes
 *    les écritures exigeaient `admin`, et un membre invité comme agent se
 *    faisait éjecter à la connexion.
 *
 * Et l'écran rejoint le gabarit des autres : mêmes compteurs de tête, même
 * `DataTable`, mêmes `FilterSelect`, toasts au lieu des bandeaux, modale au
 * lieu d'un accordéon qui poussait le tableau hors de l'écran.
 */
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useTeam, type TeamMember } from '@/composables/useTeam'
import { roleInfo, type TeamRole } from '@/lib/roles'
import { memberStatusInfo, isStaleInvite, lastSeen } from '@/lib/memberStatus'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import FilterSelect from '@/components/admin/FilterSelect.vue'
import DataTable, { type DataColumn } from '@/components/DataTable.vue'
import TeamStatsCards from '@/pages/admin/team/TeamStatsCards.vue'
import MemberIdentity from '@/pages/admin/team/MemberIdentity.vue'
import MemberActions from '@/pages/admin/team/MemberActions.vue'
import InviteDialog from '@/pages/admin/team/InviteDialog.vue'

const team = useTeam()
const {
  members, visible, loading, acting,
  roleFilter, statusFilter, hasFilters, resetFilters,
} = team

const { user } = storeToRefs(useAuthStore())

const inviteOpen = ref(false)
const revoking = ref<TeamMember | null>(null)

/**
 * Un seul menu de ligne ouvert à la fois.
 *
 * Il vivait dans chaque ligne, qui ne sait rien de ses voisines : ouvrir le
 * menu d'un membre ne refermait pas celui du précédent, et les deux se
 * chevauchaient. L'écran est le seul endroit qui voit toutes les lignes.
 */
const openMenu = ref<string | null>(null)

function toggleMenu(userId: string) {
  openMenu.value = openMenu.value === userId ? null : userId
}

onMounted(() => void team.load())

/**
 * Le dernier administrateur actif ne peut être ni rétrogradé ni révoqué.
 *
 * Sans lui, la commune perd le droit d'inviter qui que ce soit et de changer
 * un réglage — il faut alors un super-administrateur pour la débloquer. Le
 * serveur refuse (409 `last_admin`) ; l'écran le dit avant le clic.
 */
const activeAdmins = computed(() =>
  members.value.filter((member) => member.role === 'admin' && member.status !== 'suspended')
)

function isLastAdmin(member: TeamMember): boolean {
  return member.role === 'admin' && member.status !== 'suspended' && activeAdmins.value.length === 1
}

const staleInvites = computed(() => members.value.filter(isStaleInvite))

const ROLE_OPTIONS = [
  { value: '', label: 'Tous les rôles' },
  { value: 'admin', label: 'Administrateurs' },
  { value: 'agent', label: 'Agents' },
  { value: 'observer', label: 'Observateurs' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'active', label: 'Actifs' },
  { value: 'invited', label: 'Invitations en attente' },
  { value: 'suspended', label: 'Suspendus' },
]

const COLUMNS: DataColumn[] = [
  { key: 'member',   label: 'MEMBRE' },
  { key: 'role',     label: 'RÔLE',      width: '164px' },
  { key: 'status',   label: 'STATUT',    width: '150px' },
  { key: 'activity', label: 'ACTIVITÉ',  width: '190px' },
  { key: 'actions',  label: '',          width: '64px', align: 'right' },
]

async function onInvite(payload: Parameters<typeof team.invite>[0]) {
  if (await team.invite(payload)) inviteOpen.value = false
}

async function confirmRevoke() {
  if (!revoking.value) return
  if (await team.revoke(revoking.value)) revoking.value = null
}

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
</script>

<template>
  <!-- Le clic hors d'un menu le referme : les menus eux-mêmes arrêtent la
       propagation, donc tout clic qui arrive ici vient d'ailleurs. -->
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas" @click="openMenu = null">
    <AdminPageHeader>
      <template #actions>
        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 transition-colors hover:bg-brand-800"
          @click="inviteOpen = true"
        >
          <AppIcon name="UserPlus" :size="16" :stroke-width="2" class="text-white" />
          <span class="text-[13px] font-semibold leading-none text-white">Inviter un membre</span>
        </button>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-hidden px-7 py-[22px]">
      <TeamStatsCards :members="members" />

      <!-- La seule chose que cet écran peut signaler tout seul : personne ne
           pense à vérifier qui n'a jamais répondu à son invitation. -->
      <div
        v-if="staleInvites.length > 0"
        class="flex flex-none items-start gap-2.5 rounded-xl border border-[#F5D9A8] bg-status-progress-bg px-3.5 py-3"
      >
        <AppIcon name="MailQuestion" :size="16" :stroke-width="1.75" class="mt-px flex-none text-status-progress-fg" />
        <p class="text-xs leading-[1.5] text-status-progress-fg">
          <span class="font-semibold">
            {{ staleInvites.length }} invitation{{ staleInvites.length > 1 ? 's' : '' }}
            sans réponse depuis plus d’une semaine.
          </span>
          {{ staleInvites.map((member) => member.email).filter(Boolean).join(', ') }} —
          relancez depuis le menu de la ligne, ou révoquez.
        </p>
      </div>

      <DataTable
        :columns="COLUMNS"
        :rows="visible"
        row-key="user_id"
        :loading="loading"
        :skeleton-rows="5"
        :total="visible.length"
        :visible-count="visible.length"
        item-label="membres"
        empty-message="Aucun membre dans cette équipe."
      >
        <template #toolbar>
          <FilterSelect
            :model-value="roleFilter"
            :options="ROLE_OPTIONS"
            icon="Shield"
            @update:model-value="roleFilter = $event as TeamRole | ''"
          />
          <FilterSelect
            :model-value="statusFilter"
            :options="STATUS_OPTIONS"
            icon="CircleCheck"
            @update:model-value="statusFilter = $event as any"
          />
        </template>

        <template #cell-member="{ row }">
          <MemberIdentity :member="row" />
        </template>

        <template #cell-role="{ row }">
          <div class="flex min-w-0 flex-col gap-0.5">
            <span
              class="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-[5px] text-xs font-semibold leading-none"
              :class="roleInfo(row.role).classes"
            >
              <AppIcon :name="roleInfo(row.role).icon" :size="13" :stroke-width="2" />
              {{ roleInfo(row.role).label }}
            </span>
            <span v-if="row.job_title" class="truncate text-[11px] leading-[1.3] text-muted">
              {{ row.job_title }}
            </span>
          </div>
        </template>

        <template #cell-status="{ row }">
          <div class="flex min-w-0 flex-col gap-0.5">
            <span
              class="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-[5px] text-xs font-semibold leading-none"
              :class="memberStatusInfo(row.status).classes"
            >
              <AppIcon :name="memberStatusInfo(row.status).icon" :size="13" :stroke-width="2" />
              {{ memberStatusInfo(row.status).label }}
            </span>
            <span v-if="row.status === 'invited'" class="truncate text-[11px] leading-[1.3] text-muted">
              invité le {{ formatDate(row.invited_at) }}
            </span>
          </div>
        </template>

        <!-- Compté sur la trace du geste (`status_history.agent_id`), pas sur
             une affectation : la plateforme n'assigne pas les signalements. -->
        <template #cell-activity="{ row }">
          <div class="flex min-w-0 flex-col gap-0.5 text-[13px] leading-[1.3]">
            <span :class="row.handled_30d > 0 ? 'font-semibold text-ink' : 'text-faint'">
              {{ row.handled_30d > 0 ? `${row.handled_30d} traité${row.handled_30d > 1 ? 's' : ''} · 30 j` : 'rien sur 30 j' }}
            </span>
            <span class="truncate text-[11px] text-muted">
              vu {{ lastSeen(row.last_sign_in_at) }}
            </span>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <MemberActions
            :open="openMenu === row.user_id"
            :member="row"
            :is-last-admin="isLastAdmin(row)"
            :is-self="row.user_id === user?.id"
            :loading="acting"
            @toggle="toggleMenu(row.user_id)"
            @change-role="team.changeRole(row, $event)"
            @set-active="team.setActive(row, $event)"
            @resend="team.resendInvite(row)"
            @revoke="revoking = row"
          />
        </template>

        <template v-if="hasFilters" #empty>
          <div class="flex h-12 w-12 items-center justify-center rounded-[14px] bg-canvas">
            <AppIcon name="Users" :size="22" class="text-faint" />
          </div>
          <p class="text-sm text-muted">Aucun membre ne correspond à ces filtres.</p>
          <button class="text-[13px] font-semibold text-brand-700 hover:underline" @click="resetFilters">
            Réinitialiser les filtres
          </button>
        </template>
      </DataTable>
    </div>

    <InviteDialog
      :open="inviteOpen"
      :sending="acting"
      :members="members"
      @close="inviteOpen = false"
      @submit="onInvite"
    />

    <AppModal
      :open="revoking !== null"
      title="Révoquer l’accès"
      :description="`${revoking?.email ?? 'Ce membre'} perdra l’accès au back-office. Son historique de traitement est conservé.`"
      confirm-text="Révoquer"
      cancel-text="Annuler"
      confirm-variant="danger"
      :loading="acting"
      @confirm="confirmRevoke"
      @cancel="revoking = null"
      @close="revoking = null"
    />
  </div>
</template>
