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
      meta: { guestOnly: true },
    },
    {
      path: '/auth/register',
      name: 'register',
      component: () => import('@/pages/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/auth/forgot-password',
      name: 'forgot-password',
      component: () => import('@/pages/ForgotPasswordView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/auth/reset-password',
      name: 'reset-password',
      component: () => import('@/pages/ResetPasswordView.vue'),
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/pages/AuthCallbackView.vue'),
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
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      redirect: '/admin/signalements',
      children: [
        {
          path: 'signalements',
          name: 'AdminReports',
          component: () => import('@/pages/admin/ReportsAdminView.vue')
        },
        {
          path: 'heatmap',
          name: 'AdminHeatmap',
          component: () => import('@/pages/admin/HeatmapAdminView.vue')
        },
        {
          path: 'performance',
          name: 'AdminPerformance',
          component: () => import('@/pages/admin/SlaAdminView.vue')
        },
        {
          path: 'rapport',
          name: 'AdminWeekly',
          component: () => import('@/pages/admin/WeeklyReportAdminView.vue')
        },
        {
          path: 'parametres',
          name: 'AdminSettings',
          component: () => import('@/pages/admin/SettingsAdminView.vue')
        },
        {
          path: 'plateforme',
          name: 'AdminPlatform',
          component: () => import('@/pages/admin/PlatformAdminView.vue'),
          meta: { requiresSuperAdmin: true },
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    // Si on revient en arrière avec le bouton du navigateur, restaurer la position
    if (savedPosition) {
      return savedPosition
    }
    // Sinon, toujours remonter en haut
    return { top: 0, left: 0, behavior: 'instant' }
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

  // Route requires super admin role
  if (to.meta.requiresSuperAdmin && !auth.isSuperAdmin) {
    return { name: 'AdminReports' }
  }

  // Redirect authenticated users away from guest-only pages
  if (to.meta.guestOnly && auth.user) {
    return auth.isAdmin ? { name: 'AdminReports' } : { name: 'home' }
  }
})

export default router
