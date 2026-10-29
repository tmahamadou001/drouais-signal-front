import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { LoginCredentials } from '@/types/auth'
import { authApi, AuthApiError, type AuthUser } from '@/lib/authApi'
import { useTenantStore } from '@/stores/tenant'
import { pinia } from '@/stores/pinia'

export const useAuthStore = defineStore('auth', () => {
  // ─── State ────────────────────────────────────────────
  /**
   * L'utilisateur tel que **l'API** le rend, et non le `User` de Supabase.
   *
   * Le store appelait `supabase.auth.getUser()` après chaque connexion : une
   * requête de plus, vers `/auth/v1/user`, pour redemander ce que notre propre
   * `/api/auth/login` venait de renvoyer dans la même réponse. C'était le
   * dernier appel d'identité que le navigateur adressait encore directement à
   * Supabase.
   *
   * Le type change avec lui : le reste de l'application n'a besoin que de `id`
   * et `email`, et dépendre du `User` de Supabase faisait entrer dans chaque
   * écran un objet de quarante champs dont trente-huit ne servent à rien.
   */
  const user = ref<AuthUser | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)
  const tenantRole = ref<'admin' | 'agent' | 'observer' | 'citizen' | 'super_admin' | null>(null)

  // ─── Getters ──────────────────────────────────────────
  const isAuthenticated = computed(() => !!user.value)

  const isSuperAdmin = computed(() => tenantRole.value === 'super_admin')

  const isAdmin = computed(
    () => isSuperAdmin.value || tenantRole.value === 'admin'
  )

  const isAgent = computed(
    () => isAdmin.value || tenantRole.value === 'agent'
  )

  /**
   * A-t-il le droit d'agir, ou seulement de regarder ?
   *
   * Un observateur voit tout le back-office et n'y écrit rien. Lui montrer les
   * boutons quand même lui ferait découvrir la règle par un 403 — et le
   * serveur, lui, refusera.
   */
  const canAct = computed(() => isAgent.value)

  const accessToken = computed(() => session.value?.access_token ?? null)

  // ─── Init ─────────────────────────────────────────────
  async function initialize(): Promise<void> {
    if (initialized.value) return

    try {
      /**
       * La session persistée est lue par le SDK — c'est lui qui la stocke et
       * la rafraîchit, sans requête réseau. **L'identité, elle, vient de
       * l'API** : les prétentions d'un JWT lu dans le stockage du navigateur
       * ne valent que ce que le serveur en dit, et c'est le même appel qui
       * rend le rôle.
       */
      const { data } = await supabase.auth.getSession()
      session.value = data.session

      if (data.session) {
        await loadProfile(data.session.access_token)
      }
    } catch (err) {
      console.error('Auth init error:', err)
    } finally {
      initialized.value = true
    }

    /**
     * Le SDK reste la source du **jeton** : c'est lui qui le rafraîchit.
     *
     * Il n'est pas la source de l'identité — `user` vient de l'API et n'est
     * pas réécrit ici. On efface seulement quand la session disparaît.
     */
    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      if (!newSession) {
        user.value = null
        tenantRole.value = null
      }
    })
  }

  // ─── Helpers internes ─────────────────────────────────
  function setLoading(val: boolean) {
    loading.value = val
    if (val) error.value = null
  }

  // ─── Qui est là, et avec quel rôle ────────────────────

  /**
   * Un seul appel pour l'identité **et** le rôle.
   *
   * Les deux venaient de deux endroits — le JWT local pour l'un, l'API pour
   * l'autre — et il existait donc un instant où l'on savait qui était là sans
   * savoir ce qu'il avait le droit de faire.
   */
  async function loadProfile(accessToken: string): Promise<void> {
    try {
      const { user: profile } = await authApi.session(accessToken)
      user.value = profile
      tenantRole.value = profile.role
    } catch {
      // Silencieux : sans rôle, l'utilisateur est traité en citoyen, et les
      // gardes du routeur le renverront là où il a le droit d'être.
    }
  }

  async function fetchTenantRole(): Promise<void> {
    const token = session.value?.access_token
    if (token) await loadProfile(token)
  }

  // ─── CONNEXION ────────────────────────────────────────
  async function login(
    credentials: LoginCredentials
  ): Promise<{ success: boolean; error?: string }> {
    setLoading(true)

    try {
      const result = await authApi.login(credentials.email, credentials.password)

      /**
       * La session est confiée au SDK une fois obtenue.
       *
       * C'est ce qui garde le rafraîchissement automatique, la persistance et
       * le temps réel — lequel s'authentifie avec ce même jeton. Sans cet
       * appel, l'abonnement `postgres_changes` resterait anonyme et le RLS le
       * couperait.
       */
      await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      })

      // L'identité et le rôle arrivent **avec** la connexion : ni second
      // appel à notre API, ni aller-retour vers `/auth/v1/user` chez Supabase
      // pour redemander ce que la réponse contenait déjà.
      user.value = result.user
      tenantRole.value = result.user.role
      session.value = (await supabase.auth.getSession()).data.session

      return { success: true }
    } catch (err: any) {
      error.value = err instanceof AuthApiError
        ? err.message
        : 'Connexion impossible. Vérifiez votre connexion réseau.'
      return { success: false, error: error.value ?? undefined }
    } finally {
      setLoading(false)
    }
  }

  // ─── MOT DE PASSE OUBLIÉ ──────────────────────────────
  async function forgotPassword(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    setLoading(true)

    try {
      await authApi.forgotPassword(email)
      return { success: true }
    } catch (err: any) {
      error.value = err instanceof AuthApiError
        ? err.message
        : 'Une erreur est survenue. Vérifiez votre connexion.'
      return { success: false, error: error.value ?? undefined }
    } finally {
      setLoading(false)
    }
  }

  // ─── DÉCONNEXION ──────────────────────────────────────
  async function signOut({ redirect = true }: { redirect?: boolean } = {}): Promise<void> {
    /**
     * Révoquer sur le serveur avant d'effacer localement.
     *
     * Vider le stockage du navigateur laissait le jeton de rafraîchissement
     * valide : quiconque l'avait recopié pouvait continuer à obtenir des jetons
     * d'accès longtemps après la « déconnexion ». L'échec n'empêche pas de
     * partir — mieux vaut une session révoquée à moitié qu'un bouton qui ne
     * marche pas.
     */
    const token = session.value?.access_token
    if (token) {
      await authApi.logout(token).catch((err) => console.error('Révocation impossible :', err))
    }

    /**
     * `scope: 'local'` : la session vient d'être révoquée côté serveur.
     *
     * Le `signOut` par défaut appelle l'API Supabase pour révoquer — sur une
     * session déjà morte, elle répond 403. Le résultat voulu était atteint, mais
     * la console affichait une erreur à chaque déconnexion. Ici il ne reste
     * qu'à vider le stockage local, ce que `local` fait sans requête réseau.
     */
    await supabase.auth.signOut({ scope: 'local' })
    user.value = null
    session.value = null
    error.value = null
    tenantRole.value = null
    // `name: 'auth'`, pas `'home'` : aucune route ne porte ce nom, et
    // `router.push` rejetait sans rien dire — on était déconnecté mais toujours
    // devant le back-office, jusqu'au prochain rechargement de la page.
    if (!redirect) return
    const { default: router } = await import('@/router')
    await router.push({ name: 'auth' })
  }

  // ─── CLEAR ERROR ──────────────────────────────────────
  function clearError(): void {
    error.value = null
  }

  return {
    // State
    user,
    session,
    loading,
    error,
    initialized,
    // Getters
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isAgent,
    canAct,
    /**
     * Le rôle brut, tel que le serveur l'a rendu.
     *
     * Exposé sous le nom `role` et non `tenantRole` : c'est de l'état, au même
     * titre que `user` et `session`, et les booléens au-dessus ne répondent
     * qu'à « au moins ce niveau ? ». Le routeur et les écrans ont besoin de la
     * valeur elle-même pour la comparer à ce qu'ils exigent, sans qu'un
     * nouveau rôle oblige à ajouter un booléen de plus à côté.
     */
    role: tenantRole,
    accessToken,
    // Actions
    initialize,
    login,
    forgotPassword,
    signOut,
    fetchTenantRole,
    clearError,
  }
})
