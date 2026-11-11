import type { RouteRecordRaw } from 'vue-router'

/**
 * La table des routes, séparée de la création du routeur.
 *
 * Elle se lit ainsi sans instancier quoi que ce soit — les gardes ont besoin de
 * vérifier que chaque nom vers lequel ils renvoient existe vraiment, et bâtir
 * le routeur pour cela importerait Supabase et toutes les pages.
 */
/**
 * `meta.tenantless` : cette page n'appartient à aucune commune.
 *
 * La page d'un signalement, le suivi d'un dépôt sans compte et le lien remis à
 * un service extérieur sont servis sur `onsignale.fr`, où il n'y a pas de
 * sous-domaine à lire. Sans ce drapeau, `App.vue` remplaçait la page entière
 * par « Cette ville n'est pas encore configurée ».
 *
 * Les pages légales ne sont plus ici : ce sont des fichiers statiques de
 * `site/`, servis directement par Cloudflare. Elles n'ont jamais eu besoin de
 * l'application, et la faire intervenir pour du texte qui ne change pas
 * ajoutait une dépendance et un mode de panne.
 */
export const routes: RouteRecordRaw[] = [

  {
    /**
     * Le point d'entrée est désormais l'administration.
     *
     * `dreux.onsignale.fr` mène à l'écran de connexion pour qui ne l'est pas
     * — les agents municipaux sont les seuls utilisateurs du web. Le citoyen
     * passe exclusivement par l'application mobile.
     */
    path: '/',
    redirect: '/admin',
  },
  {
    path: '/signalement/suivi/:token',
    name: 'report-follow',
    meta: { tenantless: true },
    component: () => import('@/pages/ReportFollowView.vue'),
  },
  {
    path: '/connexion',
    name: 'auth',
    component: () => import('@/pages/AuthView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/auth/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/ForgotPasswordView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/pages/AuthCallbackView.vue'),
  },
  {
    path: '/set-password',
    name: 'set-password',
    component: () => import('@/pages/SetPasswordView.vue'),
  },
  {
    /**
     * Le lien d'action remis à un service extérieur.
     *
     * Public par construction : le jeton **est** l'autorisation. Exiger une
     * session ici reviendrait à demander un compte à une régie d'éclairage,
     * c'est-à-dire à renoncer au canal.
     */
    path: '/service/:token',
    name: 'service-handoff',
    meta: { tenantless: true },
    component: () => import('@/pages/ServiceHandoffView.vue'),
  },
  {
    path: '/signalement/:id',
    name: 'report-detail',
    meta: { tenantless: true },
    component: () => import('@/pages/ReportDetailView.vue'),
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    /**
     * Le back-office s'ouvre à tout membre de la commune.
     *
     * Il exigeait `requiresAdmin` : un membre invité comme agent ou
     * observateur recevait son e-mail, choisissait un mot de passe, et se
     * faisait éjecter à la porte. Chaque écran déclare maintenant le niveau
     * qu'il demande — voir, traiter, ou régler.
     */
    meta: { requiresAuth: true, minRole: 'observer' },
    redirect: '/admin/signalements',
    children: [
      {
        path: 'signalements',
        name: 'AdminReports',
        component: () => import('@/pages/admin/ReportsAdminView.vue'),
        meta: { minRole: 'observer', title: 'Signalements', subtitle: 'Gestion des signalements urbains' },
      },
      {
        path: 'heatmap',
        name: 'AdminHeatmap',
        component: () => import('@/pages/admin/HeatmapAdminView.vue'),
        meta: { minRole: 'observer', title: 'Carte de chaleur', subtitle: 'Où les signalements se concentrent' },
      },
      {
        path: 'performance',
        name: 'AdminPerformance',
        component: () => import('@/pages/admin/SlaAdminView.vue'),
        meta: { minRole: 'observer', title: 'Performance', subtitle: 'Délais de traitement et objectifs' },
      },
      {
        path: 'rapport',
        name: 'AdminWeekly',
        component: () => import('@/pages/admin/WeeklyReportAdminView.vue'),
        meta: { minRole: 'observer', title: 'Rapport hebdo', subtitle: 'Synthèse envoyée chaque semaine' },
      },
      {
        path: 'equipe',
        name: 'AdminTeam',
        component: () => import('@/pages/admin/TeamAdminView.vue'),
        meta: { minRole: 'admin', title: 'Équipe', subtitle: 'Membres et rôles de la collectivité' },
      },
      {
        path: 'parametres',
        name: 'AdminSettings',
        component: () => import('@/pages/admin/SettingsAdminView.vue'),
        meta: { minRole: 'admin', title: 'Paramètres', subtitle: 'Réglages de la collectivité' },
      },
      {
        path: 'prospects',
        name: 'AdminProspects',
        component: () => import('@/pages/admin/ProspectsAdminView.vue'),
        meta: { requiresSuperAdmin: true, title: 'Communes sans mairie', subtitle: 'Silencieuses, ouvertes au public, et liste d’attente' },
      },
      /**
       * La modération ne concerne que les communes ouvertes au public sans
       * mairie : ailleurs, ce sont les agents de la commune qui modèrent, depuis
       * leur propre écran de signalements.
       */
      {
        path: 'moderation',
        name: 'AdminModeration',
        component: () => import('@/pages/admin/ModerationAdminView.vue'),
        meta: { requiresSuperAdmin: true, title: 'Modération', subtitle: 'Ce qui est publié dans les communes sans mairie' },
      },
      {
        path: 'plateforme',
        name: 'AdminPlatform',
        component: () => import('@/pages/admin/PlatformAdminView.vue'),
        meta: { requiresSuperAdmin: true, title: 'Plateforme', subtitle: 'Toutes les collectivités' },
      },
      {
        path: 'audit',
        name: 'AdminAudit',
        component: () => import('@/pages/admin/AuditLogsAdminView.vue'),
        meta: { requiresSuperAdmin: true, title: 'Logs d’audit', subtitle: 'Toutes les actions critiques · super administrateur' },
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]
