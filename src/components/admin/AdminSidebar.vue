<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{
  isCollapsed: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-collapse'): void
}>()

const auth = useAuthStore()
const route = useRoute()

const hoveredItem = ref<string | null>(null)
let hoverTimeout: ReturnType<typeof setTimeout> | null = null

const navItems = [
  {
    id: 'reports',
    label: 'Signalements',
    icon: 'ClipboardList',
    route: '/admin/signalements',
    badge: null
  },
  {
    id: 'heatmap',
    label: 'Carte de chaleur',
    icon: 'Flame',
    route: '/admin/heatmap',
    badge: null
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: 'BarChart2',
    route: '/admin/performance',
    badge: null
  },
  {
    id: 'weekly',
    label: 'Rapport hebdo',
    icon: 'Mail',
    route: '/admin/rapport',
    badge: null
  },
  {
    id: 'settings',
    label: 'Paramètres',
    icon: 'Settings',
    route: '/admin/parametres',
    badge: null
  }
]

function isActiveRoute(itemRoute: string): boolean {
  return route.path.startsWith(itemRoute)
}

function onItemMouseEnter(itemId: string) {
  if (!props.isCollapsed) return
  if (hoverTimeout) clearTimeout(hoverTimeout)
  hoveredItem.value = itemId
}

function onItemMouseLeave() {
  if (!props.isCollapsed) return
  hoverTimeout = setTimeout(() => {
    hoveredItem.value = null
  }, 150)
}

function onItemClick() {
  hoveredItem.value = null
  if (hoverTimeout) clearTimeout(hoverTimeout)
}

const hoveredItemData = computed(() => {
  if (!hoveredItem.value) return null
  return navItems.find(item => item.id === hoveredItem.value)
})
</script>

<template>
  <aside
    class="admin-sidebar flex flex-col bg-white border-r border-gray-200 h-screen"
    :class="isCollapsed ? 'w-16' : 'w-60'"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
      <button
        @click="emit('toggle-collapse')"
        class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        :title="isCollapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'"
      >
        <AppIcon
          :name="isCollapsed ? 'ChevronRight' : 'ChevronLeft'"
          :size="18"
          class="text-gray-600"
        />
      </button>
      
      <div v-if="!isCollapsed" class="flex items-center gap-2">
        <RouterLink
          to="/"
          class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
          title="Retour à l'accueil"
        >
          <div class="w-6 h-6 bg-primary rounded flex items-center justify-center group-hover:bg-primary-600 transition-colors">
            <svg viewBox="0 0 20 20" class="w-3.5 h-3.5 text-white" fill="currentColor">
              <path d="M10 2 L17 5.5 V11 C17 15.5 14 19 10 20 C6 19 3 15.5 3 11 V5.5 Z" />
            </svg>
          </div>
          <AppIcon name="Home" :size="16" class="text-gray-500 group-hover:text-gray-700" />
        </RouterLink>
      </div>
      
      <RouterLink
        v-else
        to="/"
        class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        title="Retour à l'accueil"
      >
        <AppIcon name="Home" :size="18" class="text-gray-500" />
      </RouterLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.id"
        :to="item.route"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative"
        :class="[
          isActiveRoute(item.route)
            ? 'bg-blue-50 text-primary font-medium border-l-3 border-primary'
            : 'text-gray-700 hover:bg-gray-50',
          isCollapsed ? 'justify-center' : ''
        ]"
        @mouseenter="onItemMouseEnter(item.id)"
        @mouseleave="onItemMouseLeave"
        @click="onItemClick"
      >
        <AppIcon
          :name="item.icon"
          :size="20"
          :class="isActiveRoute(item.route) ? 'text-primary' : 'text-gray-500'"
        />
        <span
          v-if="!isCollapsed"
          class="nav-label text-sm"
        >
          {{ item.label }}
        </span>
        <span
          v-if="item.badge && !isCollapsed"
          class="ml-auto bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full"
        >
          {{ item.badge }}
        </span>
      </RouterLink>
    </nav>

    <!-- Footer -->
    <div class="px-3 py-4 border-t border-gray-200 space-y-1 flex-shrink-0">
      <div
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700"
        :class="isCollapsed ? 'justify-center' : ''"
      >
        <AppIcon name="User" :size="20" class="text-gray-500" />
        <span v-if="!isCollapsed" class="nav-label text-sm truncate">
          {{ auth.user?.email?.split('@')[0] || 'Admin' }}
        </span>
      </div>
      
      <button
        @click="auth.signOut()"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
        :class="isCollapsed ? 'justify-center' : ''"
      >
        <AppIcon name="LogOut" :size="20" />
        <span v-if="!isCollapsed" class="nav-label text-sm font-medium">
          Déconnexion
        </span>
      </button>
    </div>

  </aside>
</template>

<style scoped>
.border-l-3 {
  border-left-width: 3px;
}
</style>
