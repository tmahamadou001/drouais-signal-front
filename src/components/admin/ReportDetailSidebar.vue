<script setup lang="ts">
/**
 * Le panneau de détail d'un signalement.
 *
 * ── Pourquoi trois vues ────────────────────────────────────────────────────
 *
 * Le panneau empilait **deux listes sans borne** dans une seule colonne : le
 * journal du traitement et la conversation. Chacune grandit avec la vie du
 * signalement, et à six messages et trois changements de statut, il fallait
 * défiler sur deux mille pixels pour atteindre la réponse de l'habitant — la
 * seule chose qu'un agent vient faire ici.
 *
 * Or ces deux listes **ne se lisent pas au même moment** : on répond à
 * l'habitant tous les jours, on va voir le journal quand on se demande
 * pourquoi le statut est là. Les empiler faisait payer à l'usage fréquent le
 * prix de l'usage rare.
 *
 * Un rail à droite les sépare donc en trois destinations. Vertical parce que
 * le panneau élargi a de la largeur à donner et manquait de hauteur ; des
 * onglets horizontaux auraient pris sur ce qui manquait.
 *
 * ── Ce qui ne se cloisonne pas ─────────────────────────────────────────────
 *
 * Deux choses restent visibles partout, parce qu'on doit pouvoir les atteindre
 * sans savoir sur quelle vue on se trouve :
 *
 *  - **l'en-tête**, qui dit de quel signalement on parle ;
 *  - **les actions de statut**. Un agent qui lit la réponse de l'habitant
 *    « c'est réparé, merci » doit pouvoir clore depuis là. L'obliger à revenir
 *    sur la fiche pour ça serait la faute que le cloisonnement invente.
 *
 * La zone de saisie, elle, n'existe que dans « Échanges » : elle appartient à
 * la conversation, et l'afficher sous un journal n'aurait aucun sens.
 *
 * Le reste vit dans `report-detail/` — un panneau de huit cents lignes ne se
 * relit pas, et chacun de ces blocs a sa propre raison de changer.
 */
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import type { Report, StatusHistoryEntry, ReportStatus } from '@/types'
import { useApi } from '@/composables/useApi'
import { useAuthStore } from '@/stores/auth'
import { useTenantCategories } from '@/composables/useTenantCategories'
import { useReportComments } from '@/composables/useReportComments'
import { usePhotoUpload } from '@/composables/usePhotoUpload'
import AppIcon from '@/components/AppIcon.vue'
import PhotoLightbox from '@/components/PhotoLightbox.vue'
import TransmitDialog from '@/components/admin/TransmitDialog.vue'
import DetailRail, { type DetailView } from '@/components/admin/report-detail/DetailRail.vue'
import ReportOverview from '@/components/admin/report-detail/ReportOverview.vue'
import ReportJournal from '@/components/admin/report-detail/ReportJournal.vue'
import JournalSkeleton from '@/components/admin/report-detail/JournalSkeleton.vue'
import ReportConversation from '@/components/admin/report-detail/ReportConversation.vue'
import ReportComposer from '@/components/admin/report-detail/ReportComposer.vue'
import NoCitizenNote from '@/components/admin/report-detail/NoCitizenNote.vue'
import ReportActions from '@/components/admin/report-detail/ReportActions.vue'

const props = withDefaults(defineProps<{
  open: boolean
  report: Report | null
  loading?: boolean
  /** Y a-t-il un signalement avant / après dans la liste affichée ? */
  hasPrevious?: boolean
  hasNext?: boolean
  /** Réponses non lues de l'habitant, pour la pastille du rail. */
  unread?: number
  /**
   * Sur quelle vue ouvrir.
   *
   * « Fiche » par défaut. La cloche la surcharge avec « Échanges » : on y
   * clique parce qu'un habitant a répondu, et atterrir ailleurs que sur sa
   * réponse ferait d'un raccourci un détour.
   */
  initialView?: DetailView
}>(), {
  loading: false,
  hasPrevious: false,
  hasNext: false,
  unread: 0,
  initialView: 'overview',
})

const emit = defineEmits<{
  close: []
  previous: []
  next: []
  updateStatus: [reportId: string, status: ReportStatus, comment?: string]
  transmitted: []
  /** Le serveur a rendu une version plus fraîche que celle de la liste. */
  refreshed: [report: Report]
}>()

const { apiFetch } = useApi()
const { getCategoryLabel, getCategorySla, getServiceEmails, isOverdue } = useTenantCategories()

/**
 * Un observateur consulte et n'écrit rien.
 *
 * Les boutons disparaissent plutôt que d'être désactivés : un bouton grisé
 * invite à chercher comment l'activer, alors qu'il n'y a rien à faire — c'est
 * le rôle qui décide. Le serveur refuse de toute façon ; ceci évite de le lui
 * apprendre par un 403.
 */
const { canAct } = storeToRefs(useAuthStore())

/**
 * Le signalement, tel que le serveur le connaît maintenant.
 *
 * `props.report` vient de la **liste**, chargée une fois et mise à jour par le
 * temps réel. `GET /api/reports/:id` rend la version fraîche — et le panneau
 * la jetait pour ne garder que l'historique et le contact. Résultat : sur un
 * signalement qu'un service extérieur venait de prendre en charge, le journal
 * affichait le geste pendant que la pastille disait encore « Transmis », et la
 * frise marquait « Pris en charge » en gris *avec sa date en dessous* — deux
 * sources qui se contredisaient dans le même écran.
 *
 * La liste reste la source d'ouverture (instantanée, pas d'attente au clic) ;
 * le détail la corrige dès qu'il arrive.
 */
const detail = ref<Report | null>(null)

const report = computed(() => detail.value ?? props.report)

const reportId = computed(() => report.value?.id ?? '')

const receivedAt = computed(() =>
  report.value
    ? new Date(report.value.created_at).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : ''
)

// ─── Délai ───────────────────────────────────────────────────────────────────

const slaHours = computed(() => (report.value ? getCategorySla(report.value.category) : 0))

const deadline = computed(() =>
  report.value ? new Date(Date.parse(report.value.created_at) + slaHours.value * 3600_000) : null
)

const overdue = computed(() => (report.value ? isOverdue(report.value) : false))

/** Le retard en jours pleins, arrondi vers le bas : « en retard de 0 j » n'existe pas. */
const overdueDays = computed(() => {
  if (!deadline.value || !overdue.value) return 0
  return Math.max(1, Math.floor((Date.now() - deadline.value.getTime()) / 86_400_000))
})

// ─── Suivi et contact ────────────────────────────────────────────────────────

const history = ref<StatusHistoryEntry[]>([])

/**
 * Vrai seulement pendant le premier chargement d'un signalement.
 *
 * Un rafraîchissement du même (`reset: false`) ne le lève pas : faire
 * clignoter le journal en squelette parce qu'on revient sur l'onglet donnerait
 * l'impression que tout se recharge alors que rien n'a bougé.
 */
const historyLoading = ref(false)

/**
 * Par quel canal l'habitant peut être prévenu, s'il peut l'être.
 *
 * Calculé par le serveur, jamais deviné ici : c'est la même règle qui choisit
 * le destinataire de l'e-mail, et deux endroits qui décident séparément de
 * « joignable » finissent par ne plus être d'accord — c'est exactement ce qui
 * avait fait que les messages d'agent n'atteignaient personne.
 */
const contact = ref<{ channel: 'account' | 'email' | 'none'; reachable: boolean } | null>(null)

/** Vrai seulement quand le serveur a répondu et a répondu « non ». */
const citizenUnreachable = computed(() => contact.value?.reachable === false)

/**
 * Un signalement saisi par la commune n'a personne en face.
 *
 * À distinguer de `citizenUnreachable`, qui dit « l'habitant existe mais n'a
 * laissé aucun moyen de le joindre » : ici il n'y a pas d'habitant du tout.
 */
const noCitizen = computed(() => report.value?.source === 'agent')

/**
 * Charge le détail : le signalement frais, son historique, son contact.
 *
 * `reset` distingue l'ouverture d'un autre signalement — où il faut vider ce
 * qui appartenait au précédent — d'un simple rafraîchissement du même, où
 * vider ferait clignoter la frise et le journal pour rien.
 */
async function loadDetail(id: string, { reset = true } = {}) {
  if (reset) {
    detail.value = null
    history.value = []
    contact.value = null
    historyLoading.value = true
  }

  try {
    const data = await apiFetch<{
      report: Report
      history: StatusHistoryEntry[]
      contact: { channel: 'account' | 'email' | 'none'; reachable: boolean }
    }>(`/api/reports/${id}`)

    // Une réponse arrivée après un changement de signalement ne doit pas
    // écraser celui qu'on regarde maintenant.
    if (props.report?.id !== id) return

    detail.value = data.report ?? null
    history.value = data.history ?? []
    contact.value = data.contact ?? null

    // La ligne du tableau porte la même copie périmée : la corriger ici évite
    // que le panneau et la liste se contredisent une fois refermé.
    if (data.report) emit('refreshed', data.report)
  } catch {
    // Le suivi s'affiche alors sans dates, et l'avertissement de contact ne
    // s'affiche pas du tout : moins d'information, jamais de fausse.
  } finally {
    // `finally` et non la fin du `try` : un échec doit rendre la main à l'écran
    // vide, pas le laisser en chargement perpétuel.
    if (props.report?.id === id) historyLoading.value = false
  }
}

// ─── Conversation ────────────────────────────────────────────────────────────

const { comments, loading: commentsLoading, sending, load: loadComments, postAgentMessage } =
  useReportComments(reportId)

/**
 * La conversation à plat, dans l'ordre.
 *
 * `GET /comments` rend des **fils** : chaque message d'agent porte les réponses
 * de l'habitant dans `replies`. Parcourir la liste de premier niveau n'affiche
 * donc que la moitié de la conversation — celle de la mairie — et l'habitant
 * paraît n'avoir jamais répondu.
 */
const conversation = computed(() =>
  comments.value.flatMap((thread) => [thread, ...(thread.replies ?? [])])
)

const { uploading, uploadResolutionPhoto } = usePhotoUpload()

const composer = ref<InstanceType<typeof ReportComposer> | null>(null)
const conversationView = ref<InstanceType<typeof ReportConversation> | null>(null)
const lightboxUrl = ref<string | null>(null)

/**
 * Le panneau change de signalement sans se démonter.
 *
 * Tout ce qui dépend de l'identifiant doit donc être rechargé explicitement —
 * et le brouillon en cours effacé, sous peine d'envoyer à un habitant un
 * message écrit pour un autre.
 */
watch(
  () => props.report?.id,
  async (id) => {
    if (!id) return
    composer.value?.reset()
    await Promise.all([loadDetail(id), loadComments()])
    await nextTick()
    conversationView.value?.scrollToEnd()
  },
  { immediate: true }
)

/**
 * Le statut a bougé dans la liste : le journal a une entrée de plus.
 *
 * Le temps réel et les actions de l'agent mettent la liste à jour, mais
 * l'identifiant ne change pas — le chargement ci-dessus ne se redéclenche donc
 * pas, et le journal restait figé sur l'état d'ouverture du panneau.
 */
watch(
  () => props.report?.status,
  (next, previous) => {
    if (!props.report?.id || next === previous || previous === undefined) return
    void loadDetail(props.report.id, { reset: false })
  }
)

/**
 * Revenir sur l'onglet recharge le détail.
 *
 * C'est le moment où l'écran a le plus de chances d'être périmé — un service
 * extérieur a cliqué son lien pendant qu'on regardait ailleurs — et c'est un
 * signal, pas une horloge : une seule requête, au moment précis où quelqu'un
 * regarde à nouveau. Un intervalle ferait le même travail en le répétant
 * pendant les heures où personne ne lit.
 */
function refreshOnReturn() {
  if (document.visibilityState !== 'visible') return
  if (!props.open || !props.report?.id) return
  void loadDetail(props.report.id, { reset: false })
  void loadComments()
}

onMounted(() => {
  document.addEventListener('visibilitychange', refreshOnReturn)
  window.addEventListener('focus', refreshOnReturn)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', refreshOnReturn)
  window.removeEventListener('focus', refreshOnReturn)
})

async function onPickPhoto(file: File) {
  if (!report.value) return
  const url = await uploadResolutionPhoto(file, report.value.id)
  if (url) composer.value?.setPhoto(url)
}

async function onSend(message: string, photoUrl: string | undefined, isResolution: boolean) {
  const ok = await postAgentMessage(message, photoUrl, isResolution)
  if (!ok) return

  composer.value?.reset()
  await nextTick()
  conversationView.value?.scrollToEnd('smooth')
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function updateStatus(status: ReportStatus, comment?: string) {
  if (report.value) emit('updateStatus', report.value.id, status, comment)
}

const transmitOpen = ref(false)

const configuredRecipients = computed(() =>
  report.value ? getServiceEmails(report.value.category) : []
)

// ─── Vue courante ────────────────────────────────────────────────────────────

const view = ref<DetailView>(props.initialView)

/**
 * La pastille du rail compte ce qu'il y a **à lire**, pas ce qu'il y a à voir.
 *
 * Le journal liste désormais tous les changements de statut, auteur et date
 * compris. Les compter ici rendrait la pastille permanente — tout signalement
 * en a au moins un — et une pastille toujours allumée n'attire plus rien.
 *
 * Elle reste donc sur les entrées motivées : la réponse d'un service, un retour
 * en arrière, une précision d'agent. Le compte est volontairement **inférieur**
 * à ce que la vue montre, ce qui est le bon sens de l'écart — on annonce deux
 * et on en trouve six. L'inverse, annoncer six pour en montrer deux, est ce qui
 * fait perdre confiance à un compteur.
 */
const journalCount = computed(() =>
  history.value.filter((entry) => Boolean(entry.comment?.trim())).length
)

/**
 * Changer de signalement ramène sur la vue d'ouverture.
 *
 * Rester sur « Journal » en passant au suivant avec les flèches donnerait un
 * panneau ouvert sur une liste vide dans neuf cas sur dix — et laisserait
 * croire que le nouveau signalement n'a pas d'histoire, alors qu'on regarde
 * simplement au mauvais endroit.
 */
watch(() => props.report?.id, () => { view.value = props.initialView })

// `initialView` change quand la cloche désigne un signalement déjà ouvert : le
// panneau ne se remonte pas, donc c'est le seul signal qui l'atteint.
watch(() => props.initialView, (next) => { view.value = next })

/** La conversation se recale en bas dès qu'on revient dessus. */
watch(view, async (next) => {
  if (next !== 'messages') return
  await nextTick()
  conversationView.value?.scrollToEnd()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="slideover">
      <div v-if="open && report" class="font-ui fixed inset-0 z-50">
        <div class="absolute inset-0 bg-brand-900/30" @click="emit('close')" />

        <aside
          class="absolute inset-y-0 right-0 flex w-full max-w-[720px] border-l border-line bg-white shadow-[-18px_0_48px_rgba(15,43,74,.18)]"
        >
          <div class="flex min-w-0 flex-1 flex-col">

            <!-- L'en-tête ne se cloisonne pas : il dit de quel signalement on
                 parle, quelle que soit la vue. -->
            <header class="flex flex-none items-center gap-2.5 whitespace-nowrap border-b border-line px-[22px] py-[18px]">
              <div class="flex min-w-0 flex-1 flex-col gap-[3px]">
                <h2 class="text-base font-bold leading-[1.2] tracking-[-0.01em] text-brand-900">
                  Détail du signalement
                </h2>
                <p class="truncate text-xs font-medium leading-none tabular-nums text-muted">
                  {{ report.reference }} · reçu le {{ receivedAt }}
                </p>
              </div>

              <button
                class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-line transition-colors hover:bg-canvas disabled:opacity-40"
                :disabled="!hasPrevious"
                title="Signalement précédent"
                @click="emit('previous')"
              >
                <AppIcon name="ChevronUp" :size="17" :stroke-width="2" class="text-muted" />
              </button>
              <button
                class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-line transition-colors hover:bg-canvas disabled:opacity-40"
                :disabled="!hasNext"
                title="Signalement suivant"
                @click="emit('next')"
              >
                <AppIcon name="ChevronDown" :size="17" :stroke-width="2" class="text-muted" />
              </button>
              <button
                class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-status-pending-bg transition-colors hover:bg-line"
                title="Fermer"
                @click="emit('close')"
              >
                <AppIcon name="X" :size="18" :stroke-width="2" class="text-ink" />
              </button>
            </header>

            <!-- Une seule zone de défilement, et elle n'a qu'une liste à la
                 fois : c'est tout le propos du cloisonnement. -->
            <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-[22px] py-5">
              <ReportOverview
                v-if="view === 'overview'"
                :report="report"
                :history="history"
                :category-label="getCategoryLabel(report.category)"
                :sla-hours="slaHours"
                :deadline="deadline"
                :overdue="overdue"
                :overdue-days="overdueDays"
                :contact="contact"
                :unreachable="citizenUnreachable"
                @zoom="lightboxUrl = $event"
              />

              <ReportConversation
                v-else-if="view === 'messages'"
                ref="conversationView"
                :messages="conversation"
                :loading="commentsLoading"
                @zoom="lightboxUrl = $event"
              />

              <!-- Ce qu'un service extérieur a répondu atterrit ici : c'était
                   le seul endroit du parcours où un message écrit n'était lu
                   par personne. -->
              <template v-else>
                <JournalSkeleton v-if="historyLoading" />

                <ReportJournal v-else :history="history" />
                <!-- Sur l'historique, pas sur `journalCount` : celui-ci ne
                     compte que les entrées motivées, et le texte « aucun
                     changement » s'affichait sous une liste qui en montrait
                     quatre. -->
                <p
                  v-if="!historyLoading && history.length === 0"
                  class="text-[13px] leading-[1.5] text-muted"
                >
                  Aucun changement de statut pour l’instant. Chaque étape s’inscrira ici,
                  avec son auteur et sa date — et le motif quand il y en a un.
                </p>
              </template>
            </div>

            <footer
              v-if="canAct"
              class="flex flex-none flex-col gap-3 border-t border-line bg-canvas px-[22px] py-3.5"
            >
              <!-- La saisie appartient à la conversation : sous un journal,
                   elle n'aurait pas de sujet. -->
              <NoCitizenNote v-if="view === 'messages' && noCitizen" />

              <ReportComposer
                v-else-if="view === 'messages' && canAct"
                ref="composer"
                :sending="sending"
                :uploading="uploading"
                :unreachable="citizenUnreachable"
                @send="onSend"
                @pick-photo="onPickPhoto"
              />

              <!-- Les actions, elles, sont partout. Un agent qui lit « c'est
                   réparé, merci » doit pouvoir clore depuis là. -->
              <ReportActions
                v-if="canAct"
                :report="report"
                :loading="loading"
                :configured-recipients="configuredRecipients"
                @update-status="updateStatus"
                @transmit="transmitOpen = true"
              />
            </footer>
          </div>

          <DetailRail
            :active="view"
            :unread="unread"
            :journal-count="journalCount"
            @select="view = $event"
          />
        </aside>

        <TransmitDialog
          :open="transmitOpen"
          :report-ids="[report.id]"
          :category-label="getCategoryLabel(report.category)"
          :configured="configuredRecipients"
          @close="transmitOpen = false"
          @transmitted="emit('transmitted')"
        />

        <PhotoLightbox
          :open="lightboxUrl !== null"
          :image-url="lightboxUrl ?? ''"
          :alt="report.title"
          @close="lightboxUrl = null"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slideover-enter-active,
.slideover-leave-active {
  transition: opacity 0.3s ease;
}
.slideover-enter-active aside,
.slideover-leave-active aside {
  transition: transform 0.3s ease;
}
.slideover-enter-from,
.slideover-leave-to {
  opacity: 0;
}
.slideover-enter-from aside,
.slideover-leave-to aside {
  transform: translateX(100%);
}
</style>
