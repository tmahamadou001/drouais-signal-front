<script setup lang="ts">
/**
 * Ce qu'un service extérieur voit en cliquant le lien reçu par e-mail.
 *
 * Une régie d'éclairage, un prestataire de collecte, une police municipale : ces
 * gens ne créeront jamais de compte pour trois signalements par mois. Le lien
 * *est* l'autorisation — il vaut pour ce signalement, et pour deux gestes.
 *
 * L'écran est délibérément pauvre : le problème, où il se trouve, et deux
 * boutons. Pas de navigation, pas de liste, pas de compte à créer. Tout ce qui
 * ressemblerait à une application donnerait envie d'y chercher autre chose —
 * et il n'y a rien d'autre.
 *
 * Aucune donnée personnelle de l'habitant n'y figure : ni son nom, ni son
 * adresse e-mail, ni son compte. Le service a besoin de savoir quoi réparer et
 * où, pas qui a signalé.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import BrandLogo from '@/components/BrandLogo.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import MapView from '@/components/MapView.vue'
import { categoryGlyph } from '@/lib/categories'

const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface HandoffReport {
  id: string
  reference: string
  title: string
  description: string | null
  category: string
  status: string
  address_approx: string | null
  lat: number
  lng: number
  photo_url: string | null
  created_at: string
}

const report = ref<HandoffReport | null>(null)
const commune = ref('')
const service = ref<{ name: string | null; category: string } | null>(null)
const acknowledgedAt = ref<string | null>(null)
const completedAt = ref<string | null>(null)
/**
 * La commune a clôturé le signalement de son côté.
 *
 * Elle en garde la main : le lien ne la lui retire pas. Mais le service se
 * retrouvait alors devant deux boutons sur un signalement déjà réglé — l'écran
 * ne lisait pas le statut qu'il recevait pourtant déjà.
 */
const closedByCommune = ref(false)

const loading = ref(true)
/** `expired` et `unknown` ne disent pas la même chose au destinataire. */
const failure = ref<'expired' | 'unknown' | 'network' | null>(null)
const acting = ref<'ack' | 'done' | null>(null)
const note = ref('')

async function load() {
  loading.value = true
  failure.value = null

  try {
    const response = await fetch(`${API_URL}/api/service/${token.value}`)

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      failure.value = body.error === 'handoff_expired' ? 'expired' : 'unknown'
      return
    }

    const data = await response.json()
    report.value = data.report
    commune.value = data.commune
    service.value = data.service
    acknowledgedAt.value = data.acknowledgedAt
    completedAt.value = data.completedAt
    closedByCommune.value = Boolean(data.closedByCommune)
  } catch {
    failure.value = 'network'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function act(action: 'ack' | 'done') {
  if (acting.value) return
  acting.value = action

  try {
    const response = await fetch(`${API_URL}/api/service/${token.value}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note.value.trim() ? { note: note.value.trim() } : {}),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))

      // « Déjà clôturé par la commune » n'est pas une panne : c'est une
      // réponse. La recharger montre le nouvel état plutôt qu'un écran
      // d'erreur qui laisserait croire que le lien est cassé.
      if (body.error === 'already_closed' || body.error === 'already_completed') {
        await load()
        return
      }

      failure.value = 'unknown'
      return
    }

    // Rechargé plutôt que deviné : c'est le serveur qui décide de l'état, et
    // afficher « c'est fait » sur une requête refusée serait un mensonge.
    await load()
  } catch {
    failure.value = 'network'
  } finally {
    acting.value = null
  }
}

const receivedAt = computed(() =>
  report.value
    ? new Date(report.value.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''
)

const mapsUrl = computed(() =>
  report.value
    ? `https://www.google.com/maps/search/?api=1&query=${report.value.lat},${report.value.lng}`
    : '#'
)
</script>

<template>
  <div class="font-ui flex min-h-[100dvh] flex-col bg-canvas">

    <header class="flex flex-none items-center gap-2.5 border-b border-line bg-white px-5 py-4">
      <BrandLogo :size="28" tone="navy" />
      <div class="min-w-0">
        <div class="text-[15px] font-bold leading-none tracking-[-0.01em] text-brand-900">OnSignale</div>
        <div v-if="commune" class="truncate text-[11px] font-medium leading-none text-muted">{{ commune }}</div>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 px-5 py-6">

      <div v-if="loading" class="flex flex-col gap-4">
        <div class="flex h-32 flex-col justify-center gap-3 rounded-[14px] border border-line bg-white px-5">
          <AppSkeleton class="h-3.5 w-24 rounded" />
          <AppSkeleton class="h-5 w-4/5 rounded" />
          <AppSkeleton class="h-3.5 w-2/5 rounded" />
        </div>
        <div class="flex h-44 flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
          <AppSkeleton class="h-3.5 w-32 rounded" />
          <AppSkeleton class="h-3 w-full rounded" />
          <AppSkeleton class="h-3 w-11/12 rounded" />
          <AppSkeleton class="mt-auto h-10 w-full rounded-[10px]" />
        </div>
      </div>

      <!-- Un lien mort doit dire lequel des deux il est : périmé se règle par
           un nouvel envoi, invalide veut dire qu'on s'est trompé d'adresse. -->
      <div
        v-else-if="failure"
        class="flex flex-col items-center gap-3 rounded-[14px] border border-line bg-white px-6 py-10 text-center"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-[14px] bg-status-progress-bg">
          <AppIcon name="Link" :size="22" class="text-status-progress-fg" />
        </div>
        <h1 class="text-base font-semibold text-ink">
          {{ failure === 'expired' ? 'Ce lien a expiré' : failure === 'network' ? 'Connexion impossible' : 'Ce lien n’est pas valide' }}
        </h1>
        <p class="max-w-[380px] text-[13px] leading-[1.5] text-muted">
          {{ failure === 'expired'
            ? 'Les liens de transmission sont valables 30 jours. Demandez à la commune de vous le renvoyer.'
            : failure === 'network'
              ? 'Vérifiez votre connexion et réessayez.'
              : 'Vérifiez que vous avez ouvert le lien complet depuis l’e-mail reçu.' }}
        </p>
        <button
          v-if="failure === 'network'"
          class="mt-1 flex h-10 items-center gap-2 rounded-[10px] bg-brand-700 px-4 text-[13px] font-semibold text-white"
          @click="load"
        >
          Réessayer
        </button>
      </div>

      <template v-else-if="report">

        <!-- Le signalement -->
        <section class="flex flex-col gap-4 rounded-[14px] border border-line bg-white p-5">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-50 px-2.5 py-[5px] text-xs font-semibold leading-none text-brand-700">
              <AppIcon :name="categoryGlyph(report.category)" :size="13" :stroke-width="2" />
              {{ service?.name || 'Service concerné' }}
            </span>
            <span class="text-xs font-medium leading-none tabular-nums text-faint">{{ report.reference }}</span>
          </div>

          <h1 class="text-xl font-bold leading-[1.3] text-ink">{{ report.title }}</h1>

          <p v-if="report.description" class="text-sm leading-[1.55] text-ink">
            {{ report.description }}
          </p>

          <img
            v-if="report.photo_url"
            :src="report.photo_url"
            :alt="report.title"
            class="max-h-72 w-full rounded-xl border border-line object-cover"
          />

          <div class="flex flex-col gap-2 text-[13px] leading-[1.3] text-muted">
            <div v-if="report.address_approx" class="flex items-center gap-2">
              <AppIcon name="MapPin" :size="15" :stroke-width="1.75" class="flex-none" />
              <span>{{ report.address_approx }}</span>
            </div>
            <div class="flex items-center gap-2">
              <AppIcon name="Calendar" :size="15" :stroke-width="1.75" class="flex-none" />
              <span>Signalé le {{ receivedAt }}</span>
            </div>
          </div>

          <div class="h-40 overflow-hidden rounded-xl border border-line">
            <MapView
              :center="[report.lat, report.lng]"
              :zoom="17"
              min-height="0"
              :selected-position="{ lat: report.lat, lng: report.lng, category: report.category }"
            />
          </div>

          <!-- Un intervenant part sur le terrain : il lui faut un itinéraire,
               pas une carte de consultation. -->
          <a
            :href="mapsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-line text-[13px] font-semibold text-brand-700 transition-colors hover:bg-canvas"
          >
            <AppIcon name="Navigation" :size="15" :stroke-width="1.75" />
            Ouvrir l’itinéraire
          </a>
        </section>

        <!-- Ce qui a déjà été fait -->
        <section
          v-if="completedAt"
          class="flex items-start gap-3 rounded-[14px] border border-[#BFE5D5] bg-status-done-bg p-5"
        >
          <AppIcon name="CircleCheck" :size="20" :stroke-width="2" class="mt-px flex-none text-status-done-fg" />
          <div>
            <p class="text-sm font-semibold text-status-done-fg">Intervention déclarée terminée</p>
            <p class="mt-1 text-[13px] leading-[1.5] text-status-done-fg/80">
              La commune en a été informée, et l’habitant aussi. Merci.
            </p>
          </div>
        </section>

        <!-- La commune a clôturé de son côté.
             Elle en garde la main : elle est responsable du signalement, et le
             lien ne lui en retire rien. Ce qu'il faut au service, c'est savoir
             qu'il n'a plus rien à faire — pas deux boutons qui échoueront. -->
        <section
          v-else-if="closedByCommune"
          class="flex items-start gap-3 rounded-[14px] border border-line bg-white p-5"
        >
          <AppIcon name="CircleCheck" :size="20" :stroke-width="2" class="mt-px flex-none text-status-success" />
          <div>
            <p class="text-sm font-semibold text-ink">Ce signalement a été clôturé par la commune</p>
            <p class="mt-1 text-[13px] leading-[1.5] text-muted">
              Plus rien n’est attendu de votre part. Si vous êtes déjà intervenu, la commune
              l’a peut-être constaté elle-même — contactez-la si quelque chose vous paraît
              incohérent.
            </p>
          </div>
        </section>

        <!-- Les deux gestes -->
        <section v-else class="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
          <!-- Où va ce message : la question que se pose tout service qui voit
               un champ de saisie sans destinataire. Il rejoint le journal du
               signalement dans le back-office de la commune — il n'est pas
               envoyé à l'habitant, et le dire évite qu'on y écrive ce qu'on
               n'écrirait pas à une mairie. -->
          <div class="flex flex-col gap-2">
            <label for="note" class="text-xs font-semibold leading-none text-muted">
              PRÉCISION POUR LA COMMUNE (facultatif)
            </label>
            <textarea
              id="note"
              v-model="note"
              rows="2"
              maxlength="500"
              placeholder="Ampoule remplacée, intervention du 12/09…"
              class="resize-none rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-sm leading-[1.5] text-ink outline-none placeholder:text-faint focus:border-brand-700"
            />
            <p class="text-[11px] leading-[1.5] text-faint">
              Votre message apparaîtra dans le suivi du signalement, côté mairie, avec la date
              et votre adresse. Il accompagne le bouton sur lequel vous cliquez, et n’est pas
              transmis à l’habitant.
            </p>
          </div>

          <div
            v-if="acknowledgedAt"
            class="flex items-start gap-2.5 rounded-xl bg-status-progress-bg px-3.5 py-3"
          >
            <AppIcon name="Wrench" :size="16" :stroke-width="1.75" class="mt-px flex-none text-status-progress-fg" />
            <p class="text-[13px] leading-[1.5] text-status-progress-fg">
              Vous avez indiqué prendre en charge ce signalement. Il reste à le clôturer une fois
              l’intervention faite.
            </p>
          </div>

          <button
            v-else
            class="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-brand-700 text-[15px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
            :disabled="acting !== null"
            @click="act('ack')"
          >
            <AppIcon name="Wrench" :size="17" :stroke-width="2" />
            {{ acting === 'ack' ? 'Enregistrement…' : 'Je m’en occupe' }}
          </button>

          <button
            class="flex h-[50px] items-center justify-center gap-2 rounded-xl border border-line bg-white text-[15px] font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
            :disabled="acting !== null"
            @click="act('done')"
          >
            <AppIcon name="CircleCheck" :size="17" :stroke-width="2" class="text-status-success" />
            {{ acting === 'done' ? 'Enregistrement…' : 'Signaler l’intervention terminée' }}
          </button>
        </section>

        <p class="px-1 text-center text-xs leading-[1.5] text-faint">
          Ce lien vous est personnel et ne donne accès qu’à ce signalement.
          Vos actions sont enregistrées par la commune.
        </p>
      </template>
    </main>
  </div>
</template>
