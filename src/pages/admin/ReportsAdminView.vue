<script setup lang="ts">
/**
 * L'écran d'accueil du back-office : la table des signalements.
 *
 * Il ne garde que ce qui lui est propre — l'assemblage, le temps réel et
 * l'ouverture du panneau de détail. Les données et leurs filtres vivent dans
 * `useReportsList`, les gestes dans `useReportActions`, et les trois gros
 * blocs d'affichage dans `reports/`.
 *
 * Ce que la refonte avait apporté, et qui tient toujours :
 *
 *  - chaque compteur porte son contexte, et porte sur la totalité ;
 *  - la barre d'actions groupées est sous l'en-tête de colonnes, au niveau des
 *    lignes qu'elle vise ;
 *  - le retard se lit par catégorie, comme la commune l'a réglé.
 */
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import type { Report, ReportStatus } from '@/types'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { useAdminOverview } from '@/composables/useAdminOverview'
import { useUnreadComments } from '@/composables/useUnreadComments'
import { useRealtimeDashboard } from '@/composables/useRealtimeDashboard'
import { useReportsList } from '@/composables/useReportsList'
import { useReportActions } from '@/composables/useReportActions'
import { useTenantStore } from '@/stores/tenant'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { statusPill } from '@/lib/reportStatus'
import RealtimeToast from '@/components/admin/RealtimeToast.vue'
import ReportDetailSidebar from '@/components/admin/ReportDetailSidebar.vue'
import NotificationBell from '@/components/admin/NotificationBell.vue'
import TransmitDialog from '@/components/admin/TransmitDialog.vue'
import AppModal from '@/components/AppModal.vue'
import DataTable, { type DataColumn } from '@/components/DataTable.vue'
import { PAGE_SIZE } from '@/composables/usePageSize'
import AppIcon from '@/components/AppIcon.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import CreateReportDialog from '@/components/admin/report-create/CreateReportDialog.vue'
import ReportsStatsCards from '@/pages/admin/reports/ReportsStatsCards.vue'
import ReportsToolbar from '@/pages/admin/reports/ReportsToolbar.vue'
import ReportsBulkBar from '@/pages/admin/reports/ReportsBulkBar.vue'
import ReportTitleCell from '@/pages/admin/reports/ReportTitleCell.vue'
import ReportRowActions from '@/pages/admin/reports/ReportRowActions.vue'

const { apiFetch } = useApi()
const { categories: tenantCategories, getCategoryLabel, getServiceEmails, isOverdue } = useTenantCategories()
const { unreadByReport, loadUnread, noteReply, markRead } = useUnreadComments()
const { setReportCount, setAvgAckHours } = useAdminOverview()
const tenantStore = useTenantStore()

/**
 * Un observateur consulte et exporte ; il ne traite pas.
 *
 * Les cases à cocher, la barre d'actions groupées et les boutons de ligne
 * disparaissent pour lui. L'export reste : c'est une lecture, et c'est même à
 * peu près la seule chose qu'on attend d'un élu à qui l'on ouvre la
 * plateforme.
 */
const { canAct, isAdmin } = storeToRefs(useAuthStore())

const list = useReportsList()
const {
  reports, stats, loading, currentPage, totalPages, totalReports,
  search, filterStatus, filterCategory, filterDays, onlyOverdue, filterSource, sortBy,
  hasFilters, resetFilters, fetchData, loadStats, refreshAll, invalidateAll,
} = list

const actions = useReportActions({ refresh: refreshAll, invalidate: invalidateAll })

/** La saisie manuelle : appel téléphonique, accueil, constat de tournée. */
const creating = ref(false)
const { actionLoading, deleteLoading } = actions

const selectedIds = ref<string[]>([])
const selectedReport = ref<Report | null>(null)
const slideOverOpen = ref(false)
/**
 * Sur quelle vue du panneau atterrir.
 *
 * « Fiche » depuis le tableau — on clique une ligne pour voir de quoi il
 * s'agit. « Échanges » depuis la cloche : on y clique parce qu'un habitant a
 * répondu, et arriver ailleurs que sur sa réponse ferait d'un raccourci un
 * détour.
 */
const detailView = ref<'overview' | 'messages' | 'journal'>('overview')
const toolbar = ref<InstanceType<typeof ReportsToolbar> | null>(null)

const deleteModalOpen = ref(false)
const bulkDeleteModalOpen = ref(false)
const bulkTransmitOpen = ref(false)
const reportToDelete = ref<Report | null>(null)

// Une sélection change de contenu : ce qui était coché sur la page précédente
// n'a plus de sens ici.
list.onFilterChange.value = () => { selectedIds.value = [] }

/**
 * Le délai moyen affiché dans la barre latérale.
 *
 * Il vit sur `/api/admin/performance`, qui est réservé aux administrateurs :
 * un agent verra la barre latérale sans ce bloc plutôt qu'un écran en erreur.
 */
async function loadPerformance() {
  try {
    const data = await apiFetch<{ avg_time_to_ack_hours: number | null }>(
      '/api/admin/performance?days=90',
      { cache: { maxAge: 300_000 } }
    )
    setAvgAckHours(data.avg_time_to_ack_hours)
  } catch {
    setAvgAckHours(null)
  }
}

onMounted(() => {
  void fetchData()
  void loadStats().then(() => setReportCount(stats.value.total))
  void loadUnread()
  void loadPerformance()
})

function goToPage(page: number) {
  selectedIds.value = []
  list.goToPage(page)
}

// ─── Gestes ──────────────────────────────────────────────────────────────────

async function updateStatus(reportId: string, status: ReportStatus, comment?: string) {
  const ok = await actions.updateStatus(reportId, status, comment)
  if (ok && selectedReport.value?.id === reportId) {
    selectedReport.value = reports.value.find((report) => report.id === reportId) ?? null
  }
}

async function bulkTakeCharge() {
  await actions.bulkTakeCharge(reports.value, selectedIds.value)
  selectedIds.value = []
}

async function confirmDelete() {
  if (!reportToDelete.value) return
  if (await actions.deleteReport(reportToDelete.value)) {
    deleteModalOpen.value = false
    reportToDelete.value = null
  }
}

async function confirmBulkDelete() {
  if (await actions.deleteReports(selectedIds.value)) {
    selectedIds.value = []
    bulkDeleteModalOpen.value = false
  }
}

/**
 * Les destinataires proposés pour une transmission groupée.
 *
 * Seulement quand la sélection ne couvre qu'une catégorie : sur un mélange,
 * proposer les adresses de l'une d'elles serait choisir à la place de l'agent.
 * La boîte de dialogue bascule alors en saisie libre, qu'elle sait déjà faire.
 */
const bulkRecipients = computed(() => {
  const selected = reports.value.filter((report) => selectedIds.value.includes(report.id))
  const categories = new Set(selected.map((report) => report.category))
  return categories.size === 1 ? getServiceEmails([...categories][0]) : []
})

const bulkCategoryLabel = computed(() => {
  const selected = reports.value.filter((report) => selectedIds.value.includes(report.id))
  const categories = new Set(selected.map((report) => report.category))
  return categories.size === 1 ? getCategoryLabel([...categories][0]) : undefined
})

/**
 * Le panneau a obtenu une version plus fraîche que celle de la liste.
 *
 * Il interroge `GET /api/reports/:id` à l'ouverture ; la table, elle, garde ce
 * que la liste avait rendu. Sans cette remontée, refermer le panneau ramenait
 * la ligne à un statut que le panneau venait de démentir.
 */
function onRefreshed(fresh: Report) {
  const index = reports.value.findIndex((item) => item.id === fresh.id)
  if (index === -1) return

  const previous = reports.value[index]
  reports.value[index] = fresh
  if (selectedReport.value?.id === fresh.id) selectedReport.value = fresh

  // Les compteurs de tête portent sur la commune entière : seul un changement
  // de statut les déplace, et seulement celui-là vaut une requête.
  if (previous.status !== fresh.status) void loadStats()
}

async function onTransmitted() {
  invalidateAll()
  await refreshAll()
  selectedIds.value = []

  // Le panneau reste ouvert : l'agent veut voir le résultat de son geste, pas
  // chercher où le signalement est passé.
  if (selectedReport.value) {
    selectedReport.value =
      reports.value.find((report) => report.id === selectedReport.value?.id) ?? selectedReport.value
  }
}

// ─── Navigation dans le panneau ──────────────────────────────────────────────

/**
 * La position du signalement ouvert dans la page affichée.
 *
 * La navigation précédent/suivant ne sort pas de la page courante : elle vient
 * du tableau qui est à l'écran, et sauter d'une page à l'autre demanderait de
 * charger la suivante au clic d'une flèche — surprenant, et différent de ce que
 * l'agent voit.
 */
const openIndex = computed(() =>
  selectedReport.value ? reports.value.findIndex((report) => report.id === selectedReport.value?.id) : -1
)

const hasPrevious = computed(() => openIndex.value > 0)
const hasNext = computed(() => openIndex.value >= 0 && openIndex.value < reports.value.length - 1)

function step(offset: number) {
  const next = reports.value[openIndex.value + offset]
  if (next) selectedReport.value = next
}

function openSlideOver(report: Report, view: 'overview' | 'messages' = 'overview') {
  selectedReport.value = report
  detailView.value = view
  // Le panneau charge le fil, donc le serveur va marquer ces réponses lues.
  markRead(report.id)
  slideOverOpen.value = true
}

/** La pastille du rail porte sur le signalement ouvert, pas sur la table. */
const openUnread = computed(() =>
  selectedReport.value ? unreadByReport.value[selectedReport.value.id] ?? 0 : 0
)

function closeSlideOver() {
  slideOverOpen.value = false
  setTimeout(() => { selectedReport.value = null }, 300)
}

/**
 * Ouvre un signalement désigné par la cloche.
 *
 * Il n'est pas forcément dans la page affichée — une réponse peut arriver sur
 * un signalement vieux de trois pages. On le charge alors à l'unité plutôt que
 * de renvoyer l'agent chercher lui-même.
 */
async function openById(reportId: string) {
  const loaded = reports.value.find((report) => report.id === reportId)
  if (loaded) return openSlideOver(loaded, 'messages')

  try {
    const data = await apiFetch<{ report: Report }>(`/api/reports/${reportId}`)
    openSlideOver(data.report, 'messages')
  } catch (err) {
    console.error('Signalement introuvable :', err)
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * L'export du tableau, en CSV.
 *
 * Côté navigateur : la page a déjà les lignes, et un endpoint d'export
 * demanderait une deuxième pagination, une deuxième mise en forme des dates et
 * une deuxième définition de « en retard ». Il porte donc sur ce qui est à
 * l'écran — ce que le nom du fichier dit.
 */
function exportCsv() {
  const header = ['Référence', 'Titre', 'Catégorie', 'Statut', 'Adresse', 'Constats', 'Créé le', 'En retard']
  const rows = reports.value.map((report) => [
    report.reference ?? '',
    report.title,
    getCategoryLabel(report.category),
    report.status,
    report.address_approx ?? '',
    String(report.vote_count ?? 0),
    new Date(report.created_at).toISOString(),
    isOverdue(report) ? 'oui' : 'non',
  ])

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n')

  // BOM : sans lui Excel lit le CSV en latin-1 et massacre les accents.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `signalements-${tenantStore.slug}-page-${currentPage.value}.csv`
  link.click()

  URL.revokeObjectURL(url)
}

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

// ─── Temps réel ──────────────────────────────────────────────────────────────

const { connectionStatus, notifications, newReportIds, removeNotification } = useRealtimeDashboard({
  onNewReport: (newReport) => {
    reports.value.unshift(newReport as Report)
    stats.value = { ...stats.value, total: stats.value.total + 1, en_attente: stats.value.en_attente + 1 }
    setReportCount(stats.value.total)
  },

  onStatusChange: (reportId, newStatus, oldStatus) => {
    const report = reports.value.find((current) => current.id === reportId)
    if (report) report.status = newStatus as ReportStatus

    const next = { ...stats.value }
    if (oldStatus in next) (next as any)[oldStatus] -= 1
    if (newStatus in next) (next as any)[newStatus] += 1
    stats.value = next
  },

  onVoteChange: (reportId, newCount) => {
    const report = reports.value.find((current) => current.id === reportId)
    if (report) report.vote_count = newCount
  },

  onCitizenReply: (comment) => noteReply(comment.report_id),
})

function handleNotificationClick(reportId: string) {
  document.getElementById(`report-${reportId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/**
 * Le titre prend la place restante ; tout le reste est fixe.
 *
 * La colonne d'actions n'existe pas pour un observateur : une colonne vide
 * sur toute la hauteur du tableau se lit comme un défaut d'affichage.
 */
const COLUMNS = computed<DataColumn[]>(() => [
  /**
   * La référence en premier, avant le titre.
   *
   * C'est l'identifiant qu'un habitant dicte au téléphone et qu'une mairie
   * colle dans un e-mail : la retrouver demandait d'ouvrir la fiche. 128 px
   * tiennent `LAL-2026-00418` sans rupture — le format est fixe, la colonne
   * peut donc l'être aussi.
   */
  { key: 'reference',  label: 'RÉFÉRENCE', width: '128px' },
  { key: 'title',      label: 'SIGNALEMENT' },
  // 190 px : « Arbres, végétation et animaux » est un libellé de la taxonomie
  // nationale, pas un cas limite inventé — à 140 px il se coupait au milieu
  // d'un mot, et une catégorie tronquée ne se devine pas.
  { key: 'category',   label: 'CATÉGORIE', width: '190px' },
  { key: 'status',     label: 'STATUT',    width: '150px' },
  { key: 'votes',      label: 'CONSTATS',  width: '92px' },
  { key: 'created_at', label: 'DATE',      width: '116px' },
  ...(canAct.value ? [{ key: 'actions', label: 'ACTIONS', width: '84px', align: 'right' as const }] : []),
])
</script>

<template>
  <div class="font-ui flex min-h-0 flex-1 flex-col bg-canvas" @click="toolbar?.closeMenus()">
    <RealtimeToast
      :notifications="notifications"
      @dismiss="removeNotification"
      @click="handleNotificationClick"
    />

    <!-- L'en-tête : même composant sur les neuf écrans, titre tiré de la route.
         La page n'y dépose que ce qui lui est propre. -->
    <AdminPageHeader>
      <template #search>
        <label class="ml-5 flex h-[38px] w-full max-w-[420px] flex-1 items-center gap-2.5 rounded-[10px] border border-line bg-canvas px-3">
          <AppIcon name="Search" :size="16" :stroke-width="1.75" class="flex-none text-muted" />
          <input
            v-model="search"
            type="search"
            placeholder="Rechercher un titre, une adresse…"
            class="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
          />
        </label>
      </template>

      <template #actions>
        <div
          class="flex h-8 flex-none items-center gap-[7px] rounded-[10px] px-[11px]"
          :class="connectionStatus === 'connected' ? 'bg-status-done-bg' : 'bg-status-pending-bg'"
          :title="connectionStatus === 'connected' ? 'Mises à jour en direct' : 'Hors ligne — actualisez pour voir les nouveautés'"
        >
          <span
            class="h-[7px] w-[7px] rounded-full"
            :class="connectionStatus === 'connected' ? 'bg-status-success' : 'bg-neutral-400'"
          />
          <span
            class="text-xs font-semibold leading-none"
            :class="connectionStatus === 'connected' ? 'text-status-done-fg' : 'text-status-pending-fg'"
          >
            {{ connectionStatus === 'connected' ? 'Flux en direct' : 'Hors ligne' }}
          </span>
        </div>

        <!-- La cloche dit ce qu'elle a l'air de dire : qui a écrit. -->
        <NotificationBell @open="openById" />

        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 transition-colors hover:bg-canvas"
          @click="exportCsv"
        >
          <AppIcon name="Download" :size="16" :stroke-width="1.75" class="text-muted" />
          <span class="text-[13px] font-semibold leading-none text-ink">Exporter</span>
        </button>

        <!-- Saisir est le geste quotidien, exporter le geste rare : c'est le
             premier qui prend l'accent de la commune. -->
        <button
          class="flex h-[38px] flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-3.5 transition-colors hover:bg-brand-800"
          @click="creating = true"
        >
          <AppIcon name="Plus" :size="16" :stroke-width="2" class="text-white" />
          <span class="text-[13px] font-semibold leading-none text-white">Nouveau</span>
        </button>
      </template>
    </AdminPageHeader>

    <div class="flex min-h-0 flex-1 flex-col gap-[18px] overflow-hidden px-7 py-[22px]">
      <ReportsStatsCards :stats="stats" />

      <DataTable
        v-model:selected="selectedIds"
        :columns="COLUMNS"
        :rows="reports"
        row-key="id"
        :selectable="canAct"
        :loading="loading"
        :skeleton-rows="PAGE_SIZE"
        :highlight-row="(report) => newReportIds.has(report.id)"
        :page="currentPage"
        :page-size="PAGE_SIZE"
        :total="totalReports"
        :visible-count="reports.length"
        item-label="signalements"
        :empty-message="hasFilters
          ? 'Aucun signalement ne correspond à ces filtres.'
          : 'Aucun signalement pour le moment.'"
        @row-click="openSlideOver"
        @page-change="goToPage"
      >
        <template #toolbar>
          <ReportsToolbar
            ref="toolbar"
            :status="filterStatus"
            :category="filterCategory"
            :days="filterDays"
            :overdue-only="onlyOverdue"
            :source="filterSource"
            :sort="sortBy"
            :categories="tenantCategories"
            :overdue-count="stats.overdue"
            :category-label="filterCategory ? getCategoryLabel(filterCategory) : 'Catégories'"
            @update:status="filterStatus = $event"
            @update:category="filterCategory = $event"
            @update:days="filterDays = $event"
            @update:overdue-only="onlyOverdue = $event"
            @update:source="filterSource = $event"
            @update:sort="sortBy = $event"
          />
        </template>

        <template #head-title>
          <div class="flex min-w-0 items-center gap-2">
            <span class="whitespace-nowrap text-[11px] font-semibold leading-none tracking-[0.06em] text-muted">
              SIGNALEMENT
            </span>
            <span class="whitespace-nowrap text-[11px] font-medium leading-none tabular-nums text-faint">
              {{ totalReports }} au total
            </span>
          </div>
        </template>

        <template #bulk>
          <ReportsBulkBar
            :can-delete="isAdmin"
            :loading="actionLoading"
            @take-charge="bulkTakeCharge"
            @transmit="bulkTransmitOpen = true"
            @remove="bulkDeleteModalOpen = true"
          />
        </template>

        <!-- Cellules -->
        <template #cell-title="{ row }">
          <ReportTitleCell
            :report="row"
            :category-label="getCategoryLabel(row.category)"
            :overdue="isOverdue(row)"
            :unread="unreadByReport[row.id] ?? 0"
          />
        </template>

        <!-- Deux lignes plutôt qu'une troncature : les libellés les plus longs
             tiennent alors en entier, et le `title` rattrape le reste. -->
        <!-- `tabular-nums` : des chiffres de largeur fixe, pour que les
             références s'alignent en colonne et se comparent d'un coup d'œil. -->
        <template #cell-reference="{ row }">
          <span class="whitespace-nowrap text-[12px] font-semibold leading-none tabular-nums text-muted">
            {{ row.reference || '—' }}
          </span>
        </template>

        <template #cell-category="{ row }">
          <span
            class="line-clamp-2 text-[13px] font-medium leading-[1.3] text-ink"
            :title="getCategoryLabel(row.category)"
          >
            {{ getCategoryLabel(row.category) }}
          </span>
        </template>

        <template #cell-status="{ row }">
          <span
            class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-[5px] text-xs font-semibold leading-none"
            :class="statusPill(row.status).classes"
          >
            <AppIcon :name="statusPill(row.status).icon" :size="13" :stroke-width="2" />
            {{ statusPill(row.status).label }}
          </span>
        </template>

        <template #cell-votes="{ row }">
          <div
            class="flex items-center gap-1.5 text-[13px] font-semibold leading-none tabular-nums"
            :class="(row.vote_count || 0) > 0 ? 'text-ink' : 'text-faint'"
            :title="`${row.vote_count || 0} habitant(s) ont constaté ce problème sur place`"
          >
            <AppIcon
              name="Users" :size="15" :stroke-width="1.75"
              :class="(row.vote_count || 0) > 0 ? 'text-brand-700' : ''"
            />
            {{ row.vote_count || 0 }}
          </div>
        </template>

        <template #cell-created_at="{ row }">
          <span class="whitespace-nowrap text-[13px] font-medium leading-none tabular-nums text-muted">
            {{ formatDate(row.created_at) }}
          </span>
        </template>

        <template v-if="canAct" #cell-actions="{ row }">
          <ReportRowActions
            :can-delete="isAdmin"
            :report="row"
            :loading="actionLoading"
            @advance="updateStatus(row.id, $event)"
            @remove="reportToDelete = row; deleteModalOpen = true"
          />
        </template>

        <!-- Vide : proposer la sortie, pas seulement constater -->
        <template v-if="hasFilters" #empty>
          <div class="flex h-12 w-12 items-center justify-center rounded-[14px] bg-canvas">
            <AppIcon name="Inbox" :size="22" class="text-faint" />
          </div>
          <p class="text-sm text-muted">Aucun signalement ne correspond à ces filtres.</p>
          <button class="text-[13px] font-semibold text-brand-700 hover:underline" @click="resetFilters">
            Réinitialiser les filtres
          </button>
        </template>
      </DataTable>
    </div>

    <AppModal
      :open="deleteModalOpen"
      title="Supprimer le signalement"
      :description="`Supprimer « ${reportToDelete?.title} » ? Cette action est irréversible.`"
      confirm-text="Supprimer"
      cancel-text="Annuler"
      confirm-variant="danger"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteModalOpen = false"
      @close="deleteModalOpen = false"
    />

    <AppModal
      :open="bulkDeleteModalOpen"
      title="Supprimer les signalements"
      :description="`Supprimer ${selectedIds.length} signalement${selectedIds.length > 1 ? 's' : ''} ? Cette action est irréversible.`"
      confirm-text="Supprimer tout"
      cancel-text="Annuler"
      confirm-variant="danger"
      :loading="deleteLoading"
      @confirm="confirmBulkDelete"
      @cancel="bulkDeleteModalOpen = false"
      @close="bulkDeleteModalOpen = false"
    />

    <TransmitDialog
      :open="bulkTransmitOpen"
      :report-ids="selectedIds"
      :category-label="bulkCategoryLabel"
      :configured="bulkRecipients"
      @close="bulkTransmitOpen = false"
      @transmitted="onTransmitted"
    />

    <ReportDetailSidebar
      :open="slideOverOpen"
      :report="selectedReport"
      :loading="actionLoading"
      :has-previous="hasPrevious"
      :has-next="hasNext"
      :unread="openUnread"
      :initial-view="detailView"
      @close="closeSlideOver"
      @previous="step(-1)"
      @next="step(1)"
      @update-status="updateStatus"
      @transmitted="onTransmitted"
      @refreshed="onRefreshed"
    />
    <CreateReportDialog
      :open="creating"
      @close="creating = false"
      @created="refreshAll"
    />

  </div>
</template>
