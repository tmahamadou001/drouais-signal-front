import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomeView.vue'),
    },
    {
      path: '/signaler',
      name: 'report-form',
      component: () => import('@/pages/ReportFormView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/connexion',
      name: 'auth',
      component: () => import('@/pages/AuthView.vue'),
    },
    {
      path: '/mes-signalements',
      name: 'my-reports',
      component: () => import('@/pages/MyReportsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/signalement/:id',
      name: 'report-detail',
      component: () => import('@/pages/ReportDetailView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/pages/AdminView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Wait for initial session check to complete
  if (!auth.initialized) {
    await auth.initialize()
  }

  // Route requires authentication
  if (to.meta.requiresAuth && !auth.user) {
    return {
      name: 'auth',
      query: { redirect: to.fullPath },
    }
  }

  // Route requires admin role
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'home' }
  }

  // Already authenticated → redirect away from login page
  if (to.name === 'auth' && auth.user) {
    return { name: 'home' }
  }
})

export default router
