<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useApi } from '@/composables/useApi'

const auth = useAuthStore()
const route = useRoute()
const { apiFetch } = useApi()

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const showHeader = computed(() => !isAdminRoute.value || (isAdminRoute.value && isMobile.value))
const showFooter = computed(() => !isAdminRoute.value)

const navLinks = computed(() => {
  const links = [
    { to: '/', label: 'Accueil', show: true },
    { to: '/signaler', label: 'Signaler', show: true },
    { to: '/mes-signalements', label: 'Mes signalements', show: !!auth.user },
    { to: '/admin', label: 'Administration', show: auth.isAdmin },
  ]
  return links.filter(l => l.show)
})

const isCurrentRoute = (path: string) => {
  return route.path === path
}

const mobileMenuOpen = ref(false)

// Close mobile menu on route change
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})

// Force scroll to top on route change
watch(() => route.path, () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header v-if="showHeader" class="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <RouterLink to="/" class="flex items-center gap-2.5 group">
            <div class="w-8 h-8 bg-primary rounded-ds flex items-center justify-center">
              <svg viewBox="0 0 20 20" class="w-4.5 h-4.5 text-white" fill="currentColor">
                <path d="M10 2 L17 5.5 V11 C17 15.5 14 19 10 20 C6 19 3 15.5 3 11 V5.5 Z" />
                <circle cx="10" cy="9.5" r="2.5" fill="white" opacity="0.9"/>
                <path d="M10 13 L10 15.5" stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
              </svg>
            </div>
            <span class="font-display text-lg font-bold text-dark tracking-tight">
              On<span class="text-primary">Signale</span>
            </span>
          </RouterLink>

          <!-- Desktop nav -->
          <nav class="hidden md:flex items-center gap-1">
            <RouterLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="px-3 py-2 rounded-ds text-sm font-medium transition-colors"
              :class="isCurrentRoute(link.to)
                ? 'bg-primary-50 text-primary-600'
                : 'text-neutral-600 hover:text-dark hover:bg-neutral-100'"
            >
              {{ link.label }}
            </RouterLink>
          </nav>

          <!-- Auth buttons -->
          <div class="flex items-center gap-3">
            <template v-if="auth.user">
              <span class="hidden sm:block text-sm text-neutral-500">
                {{ auth.user.email }}
              </span>
              <button
                @click="auth.signOut()"
                class="hidden md:block text-sm font-medium text-neutral-500 hover:text-dark transition-colors"
              >
                Déconnexion
              </button>
            </template>
            <template v-else>
              <RouterLink
                to="/connexion"
                class="text-sm font-medium px-4 py-2 rounded-ds bg-primary text-white hover:bg-primary-600 transition-colors"
              >
                Se connecter
              </RouterLink>
            </template>

            <!-- Mobile menu button -->
            <button
              class="md:hidden p-2 rounded-ds text-neutral-500 hover:bg-neutral-100"
              @click="mobileMenuOpen = !mobileMenuOpen"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile nav -->
      <div v-if="mobileMenuOpen" class="md:hidden border-t border-neutral-200 bg-white">
        <nav class="px-4 py-3 space-y-1">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="block px-3 py-2 rounded-ds text-sm font-medium"
            :class="isCurrentRoute(link.to)
              ? 'bg-primary-50 text-primary-600'
              : 'text-neutral-600 hover:bg-neutral-100'"
          >
            {{ link.label }}
          </RouterLink>
          
          <button
            v-if="auth.user"
            @click="auth.signOut()"
            class="w-full text-left px-3 py-2 rounded-ds text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Déconnexion
          </button>
        </nav>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1">
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <!-- Footer -->
    <footer v-if="showFooter" class="bg-white border-t border-neutral-200 py-8 mt-auto">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-sm text-neutral-500">
            <div class="w-5 h-5 bg-primary rounded flex items-center justify-center">
              <svg viewBox="0 0 20 20" class="w-3 h-3 text-white" fill="currentColor">
                <path d="M10 2 L17 5.5 V11 C17 15.5 14 19 10 20 C6 19 3 15.5 3 11 V5.5 Z" />
              </svg>
            </div>
            OnSignale — Ville de Dreux
          </div>
          <p class="text-sm text-neutral-400">
            Service de signalement urbain citoyen
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
