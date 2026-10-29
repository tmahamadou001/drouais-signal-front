<script setup lang="ts">
/**
 * La coque du back-office : barre latérale sombre à gauche, page à droite.
 *
 * L'en-tête n'est pas ici : chaque page pose `AdminPageHeader`, qui est le même
 * composant partout et tient son titre du `meta` de la route. Le layout ne peut
 * pas le poser lui-même — les contrôles propres à un écran devraient alors y
 * être téléportés, ce que Vue ne supporte pas sans casser au premier patch.
 */
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AppIcon from '@/components/AppIcon.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useAdminOverview } from '@/composables/useAdminOverview'

const authStore = useAuthStore()
const tenantStore = useTenantStore()
const { reportCount, avgAckHours } = useAdminOverview()

/**
 * La taxonomie complète, inactives comprises — le back-office affiche des
 * signalements déjà déposés, dont certains dans des catégories que la commune
 * ne traite plus. Chargée ici plutôt que dans chaque écran : elle sert à la
 * table des signalements, à la fiche, aux filtres et aux paramètres.
 */
onMounted(() => void tenantStore.loadAllCategories())

/** La navigation du bas, sur mobile seulement — l'export ne couvre que le bureau. */
const navItems = computed(() => [
  { id: 'reports',     label: 'Signalements',    shortLabel: 'Signaux',    icon: 'Inbox',      route: '/admin/signalements', visible: true },
  { id: 'heatmap',     label: 'Carte de chaleur', shortLabel: 'Chaleur',   icon: 'Flame',      route: '/admin/heatmap',      visible: tenantStore.features.heatmap },
  { id: 'performance', label: 'Performance',     shortLabel: 'Perfs',      icon: 'TrendingUp', route: '/admin/performance',  visible: true },
  { id: 'weekly',      label: 'Rapport hebdo',   shortLabel: 'Hebdo',      icon: 'Mail',       route: '/admin/rapport',      visible: tenantStore.features.weeklyReport && authStore.isAdmin },
  { id: 'settings',    label: 'Paramètres',      shortLabel: 'Réglages',   icon: 'SlidersHorizontal', route: '/admin/parametres', visible: authStore.isAdmin },
].filter((item) => item.visible))
</script>


<template>
  <div class="flex h-screen overflow-hidden bg-canvas">

    <AdminSidebar
      class="hidden md:flex"
      :report-count="reportCount"
      :avg-ack-hours="avgAckHours"
    />

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <main class="flex min-h-0 flex-1 flex-col overflow-hidden pb-20 md:pb-0">
        <router-view />
      </main>
    </div>

    <!-- Navigation du bas, mobile uniquement -->
    <nav class="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-[1000] flex items-center justify-around border-t border-line bg-white px-2 py-2 md:hidden">
      <RouterLink
        v-for="item in navItems"
        :key="item.id"
        :to="item.route"
        class="flex flex-col items-center gap-1 rounded-lg px-3 py-1 transition-colors"
        v-slot="{ isActive }"
      >
        <AppIcon :name="item.icon" :size="22" :class="isActive ? 'text-brand-700' : 'text-muted'" />
        <span
          class="text-[10px] font-medium leading-none"
          :class="isActive ? 'text-brand-700' : 'text-muted'"
        >
          {{ item.shortLabel }}
        </span>
      </RouterLink>
    </nav>

    <!-- Monté une fois pour tout le back-office : n'importe quel écran y dépose
         un message sans avoir à le câbler. -->
    <ToastHost />

  </div>
</template>

<style scoped>
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
