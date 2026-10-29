import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import { routes } from './routes'
import { resolveAccess } from './guards'

const router = createRouter({
  history: createWebHistory(),
  routes,
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
  const auth = useAuthStore(pinia)

  // Attendre la vérification initiale de session.
  if (!auth.initialized) {
    await auth.initialize()
  }

  return resolveAccess(to, {
    isAuthenticated: Boolean(auth.user),
    isAdmin: auth.isAdmin,
    role: auth.role,
    isSuperAdmin: auth.isSuperAdmin,
  })
})

export default router
