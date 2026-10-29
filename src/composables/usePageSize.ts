/**
 * La taille de page de la plateforme.
 *
 * Elle doit rester identique à `DEFAULT_PAGE_SIZE` côté serveur
 * (`server/src/lib/pagination.ts`) : c'est le serveur qui tranche, mais
 * l'écran a besoin de la connaître pour dimensionner ses lignes fantômes et
 * calculer « 16 – 30 sur 42 » sans attendre la réponse.
 *
 * Une seule valeur pour tous les écrans : trois tableaux qui rendaient 9, 20 et
 * 25 lignes obligeaient l'agent à réapprendre à chaque onglet où finit une page.
 */
export const PAGE_SIZE = 15
