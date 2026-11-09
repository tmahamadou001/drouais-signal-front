<script setup lang="ts">
/**
 * La barre latérale du back-office, reprise de l'export Claude Design
 * (`design/admin-onsignale.screens.html`).
 *
 * Deux sections plutôt qu'une liste : `TRAITEMENT` est ce qu'un agent ouvre
 * chaque matin, `COLLECTIVITÉ` ce qu'un administrateur règle de loin en loin.
 * Les mélanger obligeait à relire les neuf entrées pour retrouver la seule qui
 * sert quinze fois par jour.
 *
 * Elle n'est plus repliable. Le bouton existait pour gagner 176 px sur un écran
 * de portable ; à 248 px de large elle tient partout, et une barre qui change
 * de forme demande à être réapprise à chaque visite.
 */
import { computed } from 'vue'
import { roleInfo } from '@/lib/roles'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import AppIcon from '@/components/AppIcon.vue'
import BrandLogo from '@/components/BrandLogo.vue'
// L'objectif interne. Au-delà, la barre passe à l'ambre.
import { ACK_TARGET_DAYS } from '@/composables/useServiceTargets'

const props = defineProps<{
  /** Le compteur affiché sur « Signalements ». */
  reportCount?: number | null
  /** Délai moyen avant prise en charge, en heures. `null` tant qu'il charge. */
  avgAckHours?: number | null
}>()

const auth = useAuthStore()
const tenant = useTenantStore()
const route = useRoute()

interface NavItem {
  id: string
  label: string
  icon: string
  route: string
  badge?: number | null
  visible: boolean
}

/** Le travail quotidien. */
const treatmentItems = computed<NavItem[]>(() => [
  {
    id: 'reports',
    label: 'Signalements',
    icon: 'Inbox',
    route: '/admin/signalements',
    badge: props.reportCount ?? null,
    visible: true,
  },
  {
    id: 'heatmap',
    label: 'Carte de chaleur',
    icon: 'Flame',
    route: '/admin/heatmap',
    visible: tenant.features.heatmap,
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: 'TrendingUp',
    route: '/admin/performance',
    visible: true,
  },
  {
    id: 'weekly',
    label: 'Rapport hebdo',
    icon: 'Mail',
    route: '/admin/rapport',
    // La synthèse se consulte ; seuls l'envoi et la liste sont réservés.
    visible: tenant.features.weeklyReport,
  },
].filter((item) => item.visible))

/** Ce qu'on règle, et qu'on ne rouvre pas tous les jours. */
const collectivityItems = computed<NavItem[]>(() => [
  { id: 'team',      label: 'Équipe',       icon: 'Users',             route: '/admin/equipe',     visible: auth.isAdmin },
  { id: 'prospects', label: 'Prospects',    icon: 'Handshake',         route: '/admin/prospects',  visible: auth.isSuperAdmin },
  { id: 'platform',  label: 'Plateforme',   icon: 'Globe',             route: '/admin/plateforme', visible: auth.isSuperAdmin },
  { id: 'settings',  label: 'Paramètres',   icon: 'SlidersHorizontal', route: '/admin/parametres', visible: auth.isAdmin },
  { id: 'audit',     label: 'Logs d’audit', icon: 'ScrollText',        route: '/admin/audit',      visible: auth.isSuperAdmin },
].filter((item) => item.visible))

function isActive(itemRoute: string): boolean {
  return route.path.startsWith(itemRoute)
}

const cityLabel = computed(() => tenant.config?.city_name || tenant.name)

const initials = computed(() => {
  const name = auth.user?.email?.split('@')[0] ?? ''
  return name.slice(0, 2).toUpperCase() || '··'
})

/**
 * Le délai moyen, en jours.
 *
 * L'API le rend en heures ; l'écran le dit en jours parce que c'est l'unité
 * dans laquelle un élu raisonne. `null` tant que la mesure n'est pas arrivée —
 * afficher « 0,0 » avant de savoir serait un chiffre faux, pas un chiffre vide.
 */
const avgAckDays = computed(() =>
  props.avgAckHours == null ? null : props.avgAckHours / 24
)


const ackRatio = computed(() =>
  avgAckDays.value == null
    ? 0
    : Math.min(avgAckDays.value / (ACK_TARGET_DAYS * 2), 1)
)
</script>

<template>
  <aside class="admin-sidebar font-ui flex w-[248px] flex-none flex-col bg-brand-900 px-3 py-5">

    <!-- Identité -->
    <RouterLink to="/admin/signalements" class="flex items-center gap-2.5 px-3 pb-6 pt-1">
      <BrandLogo :size="30" tone="white" />
      <div class="flex min-w-0 flex-col gap-0.5">
        <div class="text-[15px] font-bold leading-none tracking-[-0.01em] text-white">OnSignale</div>
        <div class="truncate text-[11px] font-medium leading-none text-brand-400">{{ cityLabel }}</div>
      </div>
    </RouterLink>

    <!-- Navigation -->
    <nav class="flex flex-col gap-0.5">
      <div class="px-3 pb-2.5 pt-2 text-[11px] font-semibold leading-none tracking-[0.1em] text-brand-500">
        TRAITEMENT
      </div>
      <RouterLink
        v-for="item in treatmentItems"
        :key="item.id"
        :to="item.route"
        class="flex h-10 items-center gap-[11px] rounded-[10px] px-3 transition-colors"
        :class="isActive(item.route) ? 'bg-brand-700' : 'hover:bg-white/[0.06]'"
      >
        <AppIcon
          :name="item.icon"
          :size="18"
          :stroke-width="isActive(item.route) ? 2 : 1.75"
          :class="isActive(item.route) ? 'text-white' : 'text-brand-500'"
        />
        <span
          class="flex-1 truncate text-sm leading-none"
          :class="isActive(item.route) ? 'font-semibold text-white' : 'font-medium text-brand-100'"
        >
          {{ item.label }}
        </span>
        <span
          v-if="item.badge"
          class="text-xs font-semibold leading-none tabular-nums"
          :class="isActive(item.route) ? 'text-white' : 'text-brand-400'"
        >
          {{ item.badge }}
        </span>
      </RouterLink>

      <div class="px-3 pb-2.5 pt-5 text-[11px] font-semibold leading-none tracking-[0.1em] text-brand-500">
        COLLECTIVITÉ
      </div>
      <RouterLink
        v-for="item in collectivityItems"
        :key="item.id"
        :to="item.route"
        class="flex h-10 items-center gap-[11px] rounded-[10px] px-3 transition-colors"
        :class="isActive(item.route) ? 'bg-brand-700' : 'hover:bg-white/[0.06]'"
      >
        <AppIcon
          :name="item.icon"
          :size="18"
          :stroke-width="isActive(item.route) ? 2 : 1.75"
          :class="isActive(item.route) ? 'text-white' : 'text-brand-500'"
        />
        <span
          class="flex-1 truncate text-sm leading-none"
          :class="isActive(item.route) ? 'font-semibold text-white' : 'font-medium text-brand-100'"
        >
          {{ item.label }}
        </span>
      </RouterLink>
    </nav>

    <!-- Pied -->
    <div class="mt-auto flex flex-col gap-3">

      <!-- Le chiffre que la commune regarde en premier, là où il ne bouge pas
           d'un écran à l'autre. -->
      <div
        v-if="avgAckDays !== null"
        class="flex flex-col gap-2.5 rounded-[10px] bg-white/[0.07] p-3.5"
      >
        <div class="flex items-center justify-between">
          <div class="text-[11px] font-semibold leading-none tracking-[0.08em] text-brand-500">
            DÉLAI MOYEN
          </div>
          <AppIcon name="Clock" :size="14" class="text-brand-500" />
        </div>
        <div class="flex items-baseline gap-1.5">
          <div class="text-2xl font-bold leading-none tabular-nums text-white">
            {{ avgAckDays.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) }}
          </div>
          <div class="text-xs font-medium leading-none text-brand-100">
            jours avant prise en charge
          </div>
        </div>
        <div class="h-1 overflow-hidden rounded-sm bg-white/[0.16]">
          <div
            class="h-1 rounded-sm transition-[width]"
            :class="avgAckDays > ACK_TARGET_DAYS ? 'bg-status-progress-dot' : 'bg-status-success'"
            :style="{ width: `${ackRatio * 100}%` }"
          />
        </div>
        <div class="text-[11px] font-medium leading-[1.3] text-brand-500">
          Objectif interne : {{ ACK_TARGET_DAYS }} jours
        </div>
      </div>

      <div class="h-px bg-white/10" />

      <div class="flex items-center gap-2.5 px-2 pb-1 pt-0.5">
        <div class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
          {{ initials }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[13px] font-semibold leading-[1.3] text-white">
            {{ auth.user?.email?.split('@')[0] || 'Admin' }}
          </div>
          <div class="text-[11px] font-medium leading-[1.3] text-brand-400">
            {{ roleInfo(auth.role ?? '').label }}
          </div>
        </div>
        <button
          class="rounded-lg p-1 text-brand-500 transition-colors hover:bg-white/10 hover:text-white"
          title="Se déconnecter"
          @click="auth.signOut()"
        >
          <AppIcon name="LogOut" :size="17" />
        </button>
      </div>
    </div>

  </aside>
</template>
