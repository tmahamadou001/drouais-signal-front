<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AppIcon from '@/components/AppIcon.vue'

const isCollapsed = ref(false)

const navItems = [
  {
    id: 'reports',
    label: 'Signalements',
    shortLabel: 'Signaux',
    icon: 'ClipboardList',
    route: '/admin/signalements'
  },
  {
    id: 'heatmap',
    label: 'Carte de chaleur',
    shortLabel: 'Chaleur',
    icon: 'Flame',
    route: '/admin/heatmap'
  },
  {
    id: 'performance',
    label: 'Performance',
    shortLabel: 'Perfs',
    icon: 'BarChart2',
    route: '/admin/performance'
  },
  {
    id: 'weekly',
    label: 'Rapport hebdo',
    shortLabel: 'Hebdo',
    icon: 'Mail',
    route: '/admin/rapport'
  },
  {
    id: 'settings',
    label: 'Paramètres',
    shortLabel: 'Réglages',
    icon: 'Settings',
    route: '/admin/parametres'
  }
]

onMounted(() => {
  const saved = localStorage.getItem('admin-sidebar-collapsed')
  if (saved !== null) {
    isCollapsed.value = JSON.parse(saved)
  }
})

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem(
    'admin-sidebar-collapsed',
    JSON.stringify(isCollapsed.value)
  )
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50 py-2 md:pt-0">

    <!-- Sidebar desktop (masquée sur mobile) -->
    <AdminSidebar
      :is-collapsed="isCollapsed"
      class="hidden md:flex flex-shrink-0"
      @toggle-collapse="toggleSidebar"
    />

    <!-- Zone de contenu principale -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">

      <!-- Header mobile uniquement -->
      <!-- <header class="md:hidden flex items-center px-4 py-3 bg-white border-b border-gray-200">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <svg viewBox="0 0 20 20" class="w-3.5 h-3.5 text-white" fill="currentColor">
              <path d="M10 2 L17 5.5 V11 C17 15.5 14 19 10 20 C6 19 3 15.5 3 11 V5.5 Z" />
            </svg>
          </div>
          <span class="font-semibold text-gray-800 text-base">
            OnSignale
          </span>
          <span class="ml-1 text-xs text-gray-400 font-medium">
            Administration
          </span>
        </div>
      </header> -->

      <!-- Contenu scrollable -->
      <main class="flex-1 overflow-y-auto pb-20 md:pb-0">
        <router-view />
      </main>

    </div>

    <!-- Bottom navigation mobile (masquée sur desktop) -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 z-50 safe-area-inset-bottom">
      <RouterLink
        v-for="item in navItems"
        :key="item.id"
        :to="item.route"
        class="flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors"
        v-slot="{ isActive }"
      >
        <AppIcon
          :name="item.icon"
          :size="22"
          :class="isActive ? 'text-blue-600' : 'text-gray-500'"
        />
        <span
          class="text-[10px] font-medium leading-none"
          :class="isActive ? 'text-blue-600' : 'text-gray-500'"
        >
          {{ item.shortLabel }}
        </span>
      </RouterLink>
    </nav>

  </div>
</template>

<style scoped>
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
